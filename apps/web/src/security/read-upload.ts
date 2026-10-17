import { UPLOAD_MAX_CHARS, UPLOAD_MAX_ROWS, parseCsv, parseUntrustedJson } from "@cayfore/engine";
import { z } from "zod";

const usageText = z.string().min(1).max(UPLOAD_MAX_CHARS);
const usageTable = z.array(z.record(z.string().max(2_000))).max(UPLOAD_MAX_ROWS);
const forecastText = z.string().max(UPLOAD_MAX_CHARS);
const forecastObject = z.record(z.unknown());

export type ReadResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Read a usage CSV. Zod checks the text and each cell. The engine also caps size and rows. */
export async function readUsageFile(file: File): Promise<ReadResult<string>> {
  if (file.size > UPLOAD_MAX_CHARS) return { ok: false, error: "That file is too large." };
  let text = "";
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "That file could not be read." };
  }
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

/** Read a forecast JSON file. The object must be plain data. */
export async function readForecastFile(file: File): Promise<ReadResult<unknown>> {
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
    const value = parseUntrustedJson(body.data);
    const envelope = forecastObject.safeParse(value);
    if (!envelope.success) return { ok: false, error: "That file is not a forecast JSON." };
    const portfolio = "portfolio" in envelope.data ? envelope.data.portfolio : envelope.data;
    if (!forecastObject.safeParse(portfolio).success) return { ok: false, error: "That file is not a forecast JSON." };
    return { ok: true, value: envelope.data };
  } catch {
    return { ok: false, error: "That file is not a forecast JSON." };
  }
}
