import { catalog, normalizePortfolio, parseSavedForecast } from "../../packages/engine/src/index.ts";
import { z } from "zod";

export const DISCLAIMER = catalog.disclaimer;

export function text(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function portfolioSchema() {
  return z
    .object({ workloads: z.array(z.record(z.unknown())).max(1000) })
    .passthrough()
    .describe(
      "A versioned saved portfolio, or shorthand with an explicit workloads array. Shorthand defaults are AWS Premium and a 12-month forecast.",
    );
}

export function readToolPortfolio(input: Record<string, unknown>) {
  if ("version" in input) return parseSavedForecast(input);
  const normalized = normalizePortfolio(input);
  if (!Array.isArray(input.workloads) || normalized.workloads.length !== input.workloads.length) {
    return { ok: false as const, error: "Portfolio workloads must contain supported workload objects." };
  }
  return parseSavedForecast(normalized);
}
