import {
  buildUnitCostCatalog,
  filterUnitCosts,
  unitCostCsv,
  unitCostJson,
  type UnitCostFilters,
} from "../packages/engine/src/unit-costs/index.ts";
import { listRegions } from "../packages/engine/src/catalog.ts";
import type { Cloud } from "../packages/engine/src/types.ts";

const keys: Record<string, keyof UnitCostFilters | "format"> = {
  "--format": "format",
  "--product": "productId",
  "--domain": "domainId",
  "--cloud": "cloud",
  "--region": "region",
  "--tier": "tier",
  "--status": "status",
  "--evidence": "evidenceLevel",
  "--component": "componentId",
  "--query": "query",
};

/** A rates command reads the same source book as the UI; it never reads a saved customer's plan. */
export function printUnitCosts(args: string[]): void {
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = keys[args[index]];
    const value = args[index + 1];
    if (!key || !value || value.startsWith("--")) throw new Error(`Invalid rates option: ${args[index]}`);
    if (options[key] !== undefined) throw new Error(`Duplicate rates option: ${args[index]}`);
    options[key] = value;
  }
  const { format = "json", ...filters } = options;
  if (!["json", "csv"].includes(format)) throw new Error("format must be json or csv");
  if (filters.cloud && !["aws", "azure", "gcp"].includes(filters.cloud))
    throw new Error("cloud must be aws, azure, or gcp");
  if (filters.tier && !["premium", "enterprise"].includes(filters.tier))
    throw new Error("tier must be premium or enterprise");
  if (
    filters.status &&
    !["priced", "approximate", "conditional", "unpriced", "not_applicable"].includes(filters.status)
  )
    throw new Error("Unknown price status");
  if (
    filters.evidenceLevel &&
    !["official", "derived", "estimate", "unresolved", "not_applicable"].includes(filters.evidenceLevel)
  )
    throw new Error("evidence must be official, derived, estimate, unresolved, or not_applicable");
  const regions = filters.cloud
    ? listRegions(filters.cloud as Cloud)
    : ["aws", "azure", "gcp"].flatMap((cloud) => listRegions(cloud as Cloud));
  if (filters.region && !regions.some((region) => region.id === filters.region))
    throw new Error(`Unknown region for the selected cloud: ${filters.region}`);
  const catalog = buildUnitCostCatalog();
  if (filters.productId && !catalog.products.some((product) => product.id === filters.productId))
    throw new Error(`Unknown product: ${filters.productId}`);
  if (filters.domainId && !catalog.products.some((product) => product.domainId === filters.domainId))
    throw new Error(`Unknown domain: ${filters.domainId}`);
  if (filters.componentId && !catalog.rows.some((row) => row.componentId === filters.componentId))
    throw new Error(`Unknown component: ${filters.componentId}`);
  const rows = filterUnitCosts(catalog.rows, filters);
  process.stdout.write(format === "csv" ? unitCostCsv(rows) : unitCostJson(catalog, rows));
}
