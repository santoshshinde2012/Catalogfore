import { catalog } from "../../packages/engine/src/index.ts";
import { z } from "zod";

export const DISCLAIMER = catalog.disclaimer;

export function text(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function portfolioSchema() {
  return z
    .record(z.unknown())
    .describe("A forecast portfolio. Missing fields are filled from the small-analytics defaults.");
}
