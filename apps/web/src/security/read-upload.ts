import {
  UPLOAD_MAX_CHARS,
  UPLOAD_MAX_ROWS,
  parseCsv,
  parseUntrustedJson,
  parseSavedForecast,
  type Portfolio,
} from "@cayfore/engine";
import { z } from "zod";

const usageText = z.string().min(1).max(UPLOAD_MAX_CHARS);
const usageTable = z.array(z.record(z.string().max(2_000))).max(UPLOAD_MAX_ROWS);
const forecastText = z.string().max(UPLOAD_MAX_CHARS);

export type ReadResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Read a usage CSV. Zod checks the text and each cell. The engine also caps size and rows. */
export function inspectUsageText(text: string): ReadResult<string> {
  const body = usageText.safeParse(text);
  if (!body.success) {
    return { ok: false, error: text.length ? "That file is too large." : "That file did not contain usage rows." };
  }
  try {
    const table = usageTable.safeParse(parseCsv(body.data));
    if (!table.success) return { ok: false, error: "That file could not be read." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "That file could not be read." };
  }
  return { ok: true, value: body.data };
}

export async function readUsageFile(file: File): Promise<ReadResult<string>> {
  if (file.size > UPLOAD_MAX_CHARS) return { ok: false, error: "That file is too large." };
  let text = "";
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "That file could not be read." };
  }
  return inspectUsageText(text);
}

/** Read a forecast JSON file. The object must be plain data. */
export async function readForecastFile(file: File): Promise<ReadResult<Portfolio>> {
  if (file.size > UPLOAD_MAX_CHARS) return { ok: false, error: "That file is too large." };
  let text = "";
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "That file is not a forecast JSON." };
  }
  const body = forecastText.safeParse(text);
  if (!body.success) return { ok: false, error: "That file is too large." };
  try {
    const parsed = parseSavedForecast(parseUntrustedJson(body.data, UPLOAD_MAX_CHARS));
    return parsed.ok ? { ok: true, value: parsed.value } : { ok: false, error: parsed.error };
  } catch {
    return { ok: false, error: "That file is not a forecast JSON." };
  }
}
