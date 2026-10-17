/**
 * @license MIT
 * Bounded adaptation of lz-string 1.5.0's URI-safe LZ decoder.
 * Upstream: https://github.com/pieroxy/lz-string
 *
 * MIT License
 * Copyright (c) 2013 pieroxy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { SHARE_MAX_CHARS } from "./untrusted.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";

class ShareBits {
  private offset = 0;

  constructor(private readonly encoded: string) {}

  read(width: number): number | null {
    if (this.offset + width > this.encoded.length * 6) return null;
    let value = 0;
    for (let bit = 0; bit < width; bit += 1) {
      const symbol = ALPHABET.indexOf(this.encoded[Math.floor(this.offset / 6)]);
      const present = (symbol >> (5 - (this.offset % 6))) & 1;
      value += present * 2 ** bit;
      this.offset += 1;
    }
    return value;
  }

  finished(): boolean {
    const remaining = this.encoded.length * 6 - this.offset;
    // The upstream encoder emits at most one final symbol of zero padding.
    return remaining <= 6 && this.read(remaining) === 0;
  }
}

/**
 * Decode an existing URI-safe share without allocating an oversized output.
 * Invalid/truncated streams and exceeded limits return null. Limits count UTF-16
 * code units, matching JSON text size checks and the upstream compression format.
 */
export function decompressShare(encoded: string, maxChars: number): string | null {
  if (!Number.isSafeInteger(maxChars) || maxChars < 0) return null;
  if (!encoded || encoded.length > SHARE_MAX_CHARS || !/^[A-Za-z0-9+ -]+$/.test(encoded)) return null;
  const bits = new ShareBits(encoded.replaceAll(" ", "+"));
  const initial = bits.read(2);
  if (initial === 2) return bits.finished() ? "" : null;
  if ((initial !== 0 && initial !== 1) || maxChars === 0) return null;
  const firstCode = bits.read(initial === 0 ? 8 : 16);
  if (firstCode === null) return null;
  let previous = String.fromCharCode(firstCode);
  const dictionary: string[] = ["", "", "", previous];
  const output = [previous];
  let outputChars = 1;
  let dictionaryChars = 1;
  let width = 3;
  let enlargeIn = 4;
  // Every iteration emits at least one character and adds at most two entries.
  // Dictionary strings total at most emitted text plus two chars per iteration.
  const dictionaryLimit = Math.min(maxChars * 2 + 4, encoded.length * 4 + 4);

  while (true) {
    let code = bits.read(width);
    if (code === null) return null;
    if (code === 2) return bits.finished() ? output.join("") : null;
    const remaining = maxChars - outputChars;
    if (remaining === 0) return null;
    if (code === 0 || code === 1) {
      const literal = bits.read(code === 0 ? 8 : 16);
      if (literal === null || dictionary.length >= dictionaryLimit || dictionaryChars + 1 > maxChars * 3) return null;
      dictionary.push(String.fromCharCode(literal));
      dictionaryChars += 1;
      code = dictionary.length - 1;
      enlargeIn -= 1;
    }
    if (enlargeIn === 0) {
      enlargeIn = 2 ** width;
      width += 1;
    }
    let entry: string;
    if (code < dictionary.length && code >= 3) entry = dictionary[code];
    else if (code === dictionary.length) {
      if (previous.length + 1 > remaining) return null;
      entry = previous + previous.charAt(0);
    } else return null;
    if (entry.length > remaining) return null;
    output.push(entry);
    outputChars += entry.length;
    const nextLength = previous.length + 1;
    if (nextLength > maxChars || dictionary.length >= dictionaryLimit || dictionaryChars + nextLength > maxChars * 3)
      return null;
    dictionary.push(previous + entry.charAt(0));
    dictionaryChars += nextLength;
    enlargeIn -= 1;
    previous = entry;
    if (enlargeIn === 0) {
      enlargeIn = 2 ** width;
      width += 1;
    }
  }
}
