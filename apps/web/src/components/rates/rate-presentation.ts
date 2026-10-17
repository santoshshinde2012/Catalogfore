import type { UnitCostRow } from "@cayfore/engine/unit-costs";

export const statusLabels: Record<UnitCostRow["status"], string> = {
  priced: "Catalog rate",
  approximate: "Approximation",
  conditional: "Conditional",
  unpriced: "Unresolved",
  not_applicable: "No standalone rate",
};

/** Preserve small token/storage rates instead of displaying a misleading $0.00. */
export function unitMoney(value: number): string {
  if (value !== 0 && Math.abs(value) < 1e-9) return `$${value.toExponential(6)}`;
  const digits = value === 0 ? 2 : Math.min(12, Math.max(2, Math.ceil(-Math.log10(Math.abs(value))) + 3));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

export function rowPrice(row: UnitCostRow): string {
  if (row.rateKind === "money" && row.unitPriceUsd !== null) return unitMoney(row.unitPriceUsd);
  if (row.rateKind === "consumption" && row.dbuPerUnit !== null)
    return `${(row.dbuPerUnit * row.unitQuantity).toLocaleString("en-US")} DBU`;
  if (row.rateKind === "multiplier" && row.value !== null) return `${row.value.toLocaleString("en-US")}×`;
  if (row.rateKind === "allowance" && row.value !== null) return row.value.toLocaleString("en-US");
  return row.status === "not_applicable" ? "Workload dependent" : "Rate unavailable";
}

export function rowBasis(row: UnitCostRow): string {
  return row.unitQuantity === 1 ? row.unit : `${row.unitQuantity.toLocaleString("en-US")} ${row.unit}`;
}

export function placementLabel(row: UnitCostRow): string {
  return [
    row.cloud?.toUpperCase() ?? "Shared context",
    row.regionLabel ?? row.region ?? "Not region-specific",
    row.tier ?? "Edition not specified",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function dimensionLabel(key: string): string {
  return (
    (
      {
        vCPU: "vCPUs",
        memoryGiB: "Memory (GiB)",
        modelUnitsPerBlock: "Model units per block",
        storageMultiplier: "Storage multiplier",
        warehouseDbuPerHour: "Warehouse DBUs / hour",
      } as Record<string, string>
    )[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase())
  );
}

export function variantLabel(row: UnitCostRow): string {
  const variant = row.variant?.replaceAll("_", " ");
  return [
    ...new Set(
      [
        row.instanceId,
        row.dimensions.model ?? row.modelId,
        row.dimensions.profile,
        row.dimensions.size,
        variant,
      ].filter(Boolean),
    ),
  ].join(" · ");
}
