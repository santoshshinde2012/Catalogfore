import { productCatalog } from "@cayfore/catalog";
import { uid } from "../money.js";
import { skuCatalog } from "../catalog.js";
import { METERED_SKUS, type MeteredSku, type Workload } from "../types.js";
import type { ProductUsage, UsageImportPreview } from "./types.js";

export interface UsageProductForecast {
  workloads: Workload[];
  unmapped: string[];
  warnings: string[];
}

export function workloadsFromUsagePreview(preview: UsageImportPreview): UsageProductForecast {
  const workloads: Workload[] = [];
  const warnings = [...preview.warnings];
  const rows: ProductUsage[] = [
    ...preview.products,
    ...preview.unmapped.map((row) => ({
      ...row,
      productId: "",
      engineSku: "other",
      skuNames: [row.skuName],
    })),
  ];
  for (const row of rows) {
    const knownSku = (METERED_SKUS as readonly string[]).includes(row.engineSku);
    const sku = (knownSku ? row.engineSku : "managed_services") as MeteredSku;
    const name =
      productCatalog.products.find((product) => product.id === row.productId)?.menuLabel ?? row.skuNames.join(", ");
    const placement = { ...(row.cloud ? { cloud: row.cloud } : {}), ...(row.region ? { region: row.region } : {}) };
    const inputs = { usageUnit: row.unit, sourceSku: row.skuNames.join(", ") };
    const base = {
      name,
      ...(row.productId ? { productId: row.productId } : {}),
      kind: "metered" as const,
      sku,
      ...placement,
    };
    if (row.dollars != null) {
      const dollars = row.dollars;
      const fixedUsdByCloud = row.cloud ? { [row.cloud]: dollars } : { aws: dollars, azure: dollars, gcp: dollars };
      workloads.push({
        ...base,
        id: uid(),
        name: row.unpricedRows ? `${name} (exported cost)` : name,
        inputs: { ...inputs, usageQuantity: row.quantity - row.unpricedQuantity },
        dbuPerMonth: row.unit === "DBU" ? row.quantity - row.unpricedQuantity : 0,
        fixedUsdByCloud,
        rateProvenance: {
          kind: "imported",
          label: `${row.costBasis ?? "list"} cost from usage export`,
          currency: "USD",
          source: preview.source,
          ...(row.costBasis && row.costBasis !== "mixed" ? { basis: row.costBasis } : {}),
        },
        priceStatus: dollars === 0 ? "free" : "priced",
      });
    }
    if (!row.unpricedRows) continue;
    const canPrice = row.unit === "DBU" && knownSku;
    workloads.push({
      ...base,
      id: uid(),
      name: row.pricedRows ? `${name} (catalog estimate)` : name,
      inputs: { ...inputs, usageQuantity: row.unpricedQuantity },
      dbuPerMonth: row.unit === "DBU" ? row.unpricedQuantity : 0,
      rateProvenance: {
        kind: "imported",
        label: canPrice ? "Bundled catalog estimate; export has no price" : "Usage export has no supported price",
        currency: "USD",
        source: preview.source,
        ...(canPrice ? { catalogVersion: skuCatalog.version, verifiedOn: skuCatalog.verifiedOn } : {}),
      },
      priceStatus: canPrice ? "approximate" : "unpriced",
    });
    if (!canPrice)
      warnings.push(
        `${name}: ${row.unpricedQuantity} ${row.unit} remains unpriced because no exported price or supported catalog DBU rate is available.`,
      );
  }
  return { workloads, unmapped: preview.unmapped.map((row) => row.skuName), warnings: [...new Set(warnings)] };
}
