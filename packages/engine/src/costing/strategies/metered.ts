import { discountDbu, lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";
import { isNetImportedRate } from "../../pricing-basis.js";
import { azureReferenceComponent, AZURE_COMPONENT_SCOPE, componentMatchesPlacement } from "../../rates/components.js";
import { ZEROBUS_USD_PER_GB, ZEROBUS_REFERENCE_REGIONS, zerobusMatchesPlacement } from "../../rates/published.js";

export const meteredStrategy = defineStrategy("metered", (workload, context) => {
  const imported = workload.rateProvenance?.kind === "imported";
  const netImported = isNetImportedRate(workload.rateProvenance);
  const dbu = imported ? workload.dbuPerMonth : Math.max(0, workload.dbuPerMonth);
  const base = lineShell(workload);
  const reference = azureReferenceComponent(workload.productId);
  const independent = workload.rateProvenance?.kind === "custom" || imported;
  const publicZerobus = workload.productId === "zerobus" && !independent;
  if (publicZerobus && !zerobusMatchesPlacement(context.placement.cloud, context.placement.region)) {
    base.notes.push(
      `Unpriced: the public Zerobus GB snapshot covers only AWS ${ZEROBUS_REFERENCE_REGIONS.aws} and Azure ${ZEROBUS_REFERENCE_REGIONS.azure}; no rate is inferred for this placement. Supply a labelled independent rate to price it.`,
    );
    return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: 0, cloudCost: 0 };
  }
  if (reference && !independent && !componentMatchesPlacement(context.placement.cloud, context.placement.region)) {
    base.notes.push(
      `Unpriced: this public ${reference.unit} rate is observed only in ${AZURE_COMPONENT_SCOPE.cloud} ${AZURE_COMPONENT_SCOPE.region}; no rate is inferred for this placement. Supply a labelled independent rate to price it.`,
    );
    return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: 0, cloudCost: 0 };
  }
  if (workload.priceStatus === "unpriced") {
    base.notes.push("Usage retained but unpriced; provide a labelled rate or a supported catalog mapping.");
    return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: 0, cloudCost: 0 };
  }
  if (publicZerobus) {
    const rate = ZEROBUS_USD_PER_GB[context.placement.cloud]?.[context.placement.tier];
    const quantity = Math.max(0, Number(workload.units ?? workload.inputs?.gb ?? 0));
    if (rate === undefined) base.notes.push("Unpriced: no public Zerobus GB rate is stored for this placement.");
    else
      base.notes.push(
        `Public GB price ${rate} USD observed in ${context.placement.region}; quantities use the installed component price book.`,
      );
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu,
      dbuCost: rate === undefined ? 0 : discountDbu(quantity * rate, context.portfolio),
      cloudCost: 0,
    };
  }
  if (reference && !independent) {
    const quantity =
      reference.unit === "DBU"
        ? dbu
        : workload.productId === "clean_rooms"
          ? Math.max(0, workload.units ?? 1)
          : Math.max(0, Number(workload.units ?? workload.inputs?.gb ?? 0));
    base.notes.push(
      `Public ${reference.unit} price ${reference.usdPerUnit} USD observed in ${AZURE_COMPONENT_SCOPE.region}; quantities use the installed component price book.`,
    );
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu,
      dbuCost: discountDbu(quantity * reference.usdPerUnit, context.portfolio),
      cloudCost: 0,
    };
  }
  const cloud = context.placement.cloud;
  if (workload.rateByPlacement) {
    const units = imported ? (workload.units ?? 0) : Math.max(0, workload.units ?? 0);
    const rate = workload.rateByPlacement[cloud]?.[context.placement.tier];
    if (rate == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu: imported ? dbu : 0,
      dbuCost: rate == null ? 0 : discountDbu(units * rate, context.portfolio),
      cloudCost: 0,
    };
  }
  if (workload.fixedUsdByCloud) {
    const usd = workload.fixedUsdByCloud[cloud];
    if (usd == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu: imported ? dbu : 0,
      dbuCost: usd == null ? 0 : netImported ? usd : discountDbu(usd, context.portfolio),
      cloudCost: 0,
    };
  }
  if (workload.rateByCloud) {
    const rate = workload.rateByCloud[cloud];
    if (rate == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu,
      dbuCost: rate == null ? 0 : discountDbu(dbu * rate, context.portfolio),
      cloudCost: 0,
    };
  }
  return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: priceDbu(dbu, context, workload.sku), cloudCost: 0 };
});
