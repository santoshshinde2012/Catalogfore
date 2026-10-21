import { UPLOAD_MAX_CHARS } from "@cayfore/engine";
import { usageReadMarks } from "../services/usage-samples";
import { inspectUsageText, type ReadResult } from "./read-upload";

/** Read a usage file, reporting 0–1 while bytes arrive, then validate the text. */
export async function readUsageWithProgress(
  file: File,
  onProgress: (ratio: number) => void,
): Promise<ReadResult<string>> {
  if (file.size > UPLOAD_MAX_CHARS) return { ok: false, error: "That file is too large." };
  onProgress(usageReadMarks.opened);
  let text = "";
  try {
    text = await readBlobText(file, (ratio) =>
      onProgress(Math.min(usageReadMarks.readCap, usageReadMarks.reading + ratio * usageReadMarks.readWeight)),
    );
  } catch {
    return { ok: false, error: "That file could not be read." };
  }
  onProgress(usageReadMarks.checked);
  const result = inspectUsageText(text);
  onProgress(usageReadMarks.done);
  return result;
}

function readBlobText(file: Blob, onProgress: (ratio: number) => void): Promise<string> {
  const readable = file as Blob & { text?: () => Promise<string> };
  if (!(file instanceof Blob) || typeof FileReader === "undefined") {
    if (typeof readable.text !== "function") return Promise.reject(new Error("unreadable"));
    return readable.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    reader.onload = () => {
      onProgress(1);
      resolve(String(reader.result ?? ""));
    };
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"));
    reader.readAsText(file);
  });
}
