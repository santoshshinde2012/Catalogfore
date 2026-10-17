import type { UnitCostCatalog, UnitCostFilters, UnitCostRow } from "./types.js";

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
/** Unscoped context rows match every placement; a scoped rate never implies coverage elsewhere. */
export function filterUnitCosts(rows: readonly UnitCostRow[], filters: UnitCostFilters = {}): UnitCostRow[] {
  const terms = normalize(filters.query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const dimensions = ["productId", "domainId", "cloud", "region", "tier", "componentId", "status"] as const;
  return rows.filter((row) => {
    if (
      dimensions.some((key) => {
        if (!filters[key] || filters[key] === "all") return false;
        if (["cloud", "region", "tier"].includes(key) && row[key] === null) return false;
        return row[key] !== filters[key];
      })
    )
      return false;
    const text = normalize(
      [
        row.productId,
        row.productName,
        row.domainName,
        row.componentName,
        row.cloud,
        row.regionLabel,
        row.region,
        row.tier,
        row.variant,
        row.modelId,
        row.instanceId,
        row.unit,
        row.status,
        row.confidence,
        ...row.notes,
        ...Object.values(row.dimensions),
        ...row.sources.flatMap((source) => [source.title, source.url]),
      ].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
}

const columns = [
  "id",
  "productId",
  "productName",
  "partId",
  "componentId",
  "componentName",
  "domainId",
  "domainName",
  "category",
  "cloud",
  "region",
  "regionLabel",
  "tier",
  "sku",
  "variant",
  "modelId",
  "instanceId",
  "unit",
  "unitQuantity",
  "unitPriceUsd",
  "usdPerUnit",
  "dbuPerUnit",
  "baseRateUsd",
  "baseRateUnit",
  "regionFactor",
  "sourceRegion",
  "status",
  "confidence",
  "rateKind",
  "value",
  "formula",
  "includesCompute",
  "effectiveFrom",
  "effectiveTo",
  "conditions",
  "notes",
  "dimensions",
  "sources",
] as const satisfies readonly (keyof UnitCostRow)[];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Spreadsheet applications must not interpret source labels or future catalog prose as formulas.
  const safe = typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function unitCostCsv(rows: readonly UnitCostRow[]): string {
  return (
    [columns.join(","), ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(","))].join("\r\n") + "\r\n"
  );
}

/** A filtered export retains the price-book context and only the selected product inventory. */
export function unitCostJson(catalog: UnitCostCatalog, rows: readonly UnitCostRow[] = catalog.rows): string {
  const ids = new Set(rows.map((row) => row.productId));
  return (
    JSON.stringify({ ...catalog, products: catalog.products.filter((product) => ids.has(product.id)), rows }, null, 2) +
    "\n"
  );
}
