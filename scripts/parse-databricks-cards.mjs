import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { CARD_SKUS, calculatorRegion } from "./databricks-rate-mapping.mjs";

export function flattenCardLeaves(value, pointer = "") {
  if (value !== null && typeof value === "object")
    return Object.entries(value).flatMap(([key, child]) =>
      flattenCardLeaves(child, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`),
    );
  return [{ pointer, value }];
}

/** Only exact, documented USD/DBU product keys; composite endpoint/storage and model units stay excluded. */
export function parseDatabricksCards(text, source, observedOn) {
  const input = JSON.parse(text);
  if (!input?.premium?.AWS || !input?.premium?.GCP || !input?.enterprise?.AWS || !input?.enterprise?.GCP)
    throw new Error("First-party price-card shape changed");
  const leaves = flattenCardLeaves(input);
  const groups = new Map();
  const issues = [];
  const excluded = new Map();
  leaves.forEach(({ pointer, value }, index) => {
    const [tier, cloudLabel, rawCompute, regionLabel] = pointer
      .slice(1)
      .split("/")
      .map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));
    const cloud = cloudLabel === "AWS" ? "aws" : cloudLabel === "GCP" ? "gcp" : null;
    const sku = CARD_SKUS.get(rawCompute);
    if (!["premium", "enterprise"].includes(tier) || !cloud || !sku) {
      excluded.set(
        "non-mapped-tier-cloud-product-or-unit",
        (excluded.get("non-mapped-tier-cloud-product-or-unit") ?? 0) + 1,
      );
      return;
    }
    const region = calculatorRegion(cloud, regionLabel);
    if (region === undefined) {
      excluded.set("unmapped-or-government-region", (excluded.get("unmapped-or-government-region") ?? 0) + 1);
      return;
    }
    const price = typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
    if (!Number.isFinite(price) || price <= 0 || price > 10 || region === null) {
      issues.push({
        id: `${source.id}:${index}:invalid-DBU-price-card`,
        cloud,
        region: region ?? null,
        tier,
        sku,
        reason: "invalid-or-unavailable-DBU-price-card",
        status: "quarantined",
        sourceId: source.id,
        sourceRowIndexes: [index],
        sourcePointer: pointer,
      });
      return;
    }
    const key = [cloud, region, tier, sku].join(":");
    const group = groups.get(key) ?? {
      cloud,
      region,
      tier,
      sku,
      currency: "USD",
      unit: "DBU",
      sourceId: source.id,
      sourceCompute: rawCompute,
      sourceRegion: regionLabel,
      observedOn,
      effectiveFrom: null,
      effectiveTo: null,
      values: new Set(),
      indexes: [],
      pointers: [],
    };
    group.values.add(price);
    group.indexes.push(index);
    group.pointers.push(pointer);
    groups.set(key, group);
  });
  const rates = [];
  for (const [key, group] of groups) {
    if (group.values.size !== 1) {
      issues.push({
        id: `${source.id}:${key}`,
        cloud: group.cloud,
        region: group.region,
        tier: group.tier,
        sku: group.sku,
        reason: "conflicting-first-party-USD-per-DBU-values",
        status: "conflict",
        sourceId: source.id,
        sourceRowIndexes: group.indexes,
        sourceValues: [...group.values],
        sourcePointers: group.pointers,
      });
      continue;
    }
    const { values, indexes, pointers, ...rate } = group;
    rates.push({
      ...rate,
      usdPerUnit: [...values][0],
      sourceRowIndex: indexes[0],
      sourcePointer: pointers[0],
      matchedRows: indexes.length,
    });
  }
  if (!rates.length) throw new Error("No eligible first-party price-card DBU rates");
  return {
    source: {
      id: source.id,
      cloud: "multi",
      url: source.url,
      sha256: createHash("sha256").update(text).digest("hex"),
      bytes: Buffer.byteLength(text, "utf8"),
      rowCount: leaves.length,
      observedOn,
    },
    rates: rates.sort((a, b) =>
      [a.cloud, a.region, a.tier, a.sku].join(":").localeCompare([b.cloud, b.region, b.tier, b.sku].join(":")),
    ),
    issues,
    exclusions: [...excluded].map(([reason, rowCount]) => ({ sourceId: source.id, reason, rowCount })),
  };
}
