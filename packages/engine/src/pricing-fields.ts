import type { RateProvenance } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rateProvenanceOf(value: unknown): RateProvenance | undefined {
  if (!isRecord(value) || !["catalog", "custom", "imported"].includes(String(value.kind))) return undefined;
  if (value.currency !== "USD" || typeof value.label !== "string" || !value.label.trim()) return undefined;
  const text = (key: string) => (typeof value[key] === "string" ? String(value[key]).slice(0, 240) : undefined);
  return {
    kind: value.kind as RateProvenance["kind"],
    currency: "USD",
    label: value.label.slice(0, 120),
    ...(text("source") ? { source: text("source") } : {}),
    ...(text("verifiedOn") ? { verifiedOn: text("verifiedOn") } : {}),
    ...(text("catalogVersion") ? { catalogVersion: text("catalogVersion") } : {}),
    ...(["list", "effective-list", "effective", "billed"].includes(String(value.basis))
      ? { basis: value.basis as RateProvenance["basis"] }
      : {}),
  };
}
