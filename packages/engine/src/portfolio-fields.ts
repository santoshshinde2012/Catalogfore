import { clamp, uid } from "./money.js";
import type { Cloud, Tier } from "./types.js";
import { rateProvenanceOf } from "./pricing-fields.js";

export const CLOUDS: Cloud[] = ["aws", "azure", "gcp"];
export const TIERS: Tier[] = ["premium", "enterprise"];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function num(value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

export function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function schedule(value: unknown, fallbackHours: number, fallbackDays: number) {
  const record = isRecord(value) ? value : {};
  return {
    hoursPerDay: num(record.hoursPerDay, fallbackHours, 0, 24),
    daysPerWeek: num(record.daysPerWeek, fallbackDays, 0, 7),
  };
}

export function scale(value: unknown, fallbackMin: number, fallbackMax: number, fallbackUtil: number) {
  const record = isRecord(value) ? value : {};
  return {
    min: num(record.min, fallbackMin, 0, 1_000_000),
    max: num(record.max, fallbackMax, 0, 1_000_000),
    utilization: num(record.utilization, fallbackUtil, 0, 1),
  };
}

export function placementRates(value: unknown): Partial<Record<Cloud, Partial<Record<Tier, number>>>> | undefined {
  if (!isRecord(value)) return undefined;
  const rates: Partial<Record<Cloud, Partial<Record<Tier, number>>>> = {};
  for (const cloud of CLOUDS) {
    const row = value[cloud];
    if (!isRecord(row)) continue;
    const tierRates: Partial<Record<Tier, number>> = {};
    for (const tier of TIERS) {
      if (row[tier] != null) tierRates[tier] = num(row[tier], 0, 0, 1_000_000);
    }
    if (Object.keys(tierRates).length > 0) rates[cloud] = tierRates;
  }
  return Object.keys(rates).length > 0 ? rates : undefined;
}

export function cloudRates(value: unknown, signed = false): Partial<Record<Cloud, number>> | undefined {
  if (!isRecord(value)) return undefined;
  const rates: Partial<Record<Cloud, number>> = {};
  for (const cloud of CLOUDS) {
    if (value[cloud] != null) rates[cloud] = num(value[cloud], 0, signed ? -1e12 : 0, signed ? 1e12 : 1_000_000);
  }
  return Object.keys(rates).length > 0 ? rates : undefined;
}

export function cloudOf(value: unknown): Cloud | undefined {
  return CLOUDS.includes(value as Cloud) ? (value as Cloud) : undefined;
}

export function tierOf(value: unknown): Tier | undefined {
  return TIERS.includes(value as Tier) ? (value as Tier) : undefined;
}

export function base(record: Record<string, unknown>, fallbackName: string) {
  const cloud = cloudOf(record.cloud);
  const tier = tierOf(record.tier);
  const rateProvenance = rateProvenanceOf(record.rateProvenance);
  return {
    id: str(record.id, uid()),
    name: str(record.name, fallbackName).slice(0, 80),
    ...(cloud ? { cloud } : {}),
    ...(typeof record.region === "string" ? { region: record.region } : {}),
    ...(tier ? { tier } : {}),
    ...(typeof record.productId === "string" && /^[a-z0-9_]+$/.test(record.productId)
      ? { productId: record.productId }
      : {}),
    ...(typeof record.partId === "string" && /^[a-z0-9_]+$/.test(record.partId) ? { partId: record.partId } : {}),
    ...(inputsOf(record.inputs) ? { inputs: inputsOf(record.inputs) } : {}),
    ...(rateProvenance ? { rateProvenance } : {}),
    ...(["priced", "approximate", "unpriced", "free"].includes(String(record.priceStatus))
      ? { priceStatus: record.priceStatus as "priced" | "approximate" | "unpriced" | "free" }
      : {}),
  };
}

export function inputsOf(value: unknown): Record<string, number | string> | undefined {
  if (!isRecord(value)) return undefined;
  const inputs: Record<string, number | string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) continue;
    if (typeof item === "number" && Number.isFinite(item)) inputs[key] = item;
    else if (typeof item === "string" && item.length > 0 && item.length <= (key === "sourceSku" ? 512 : 40))
      inputs[key] = item;
  }
  return Object.keys(inputs).length > 0 ? inputs : undefined;
}
