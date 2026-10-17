import { UploadError } from "../untrusted.js";
import { cloudField, dateField, field, numberField, objectField, type CsvRecord } from "./fields.js";
import type { UsageImportOptions, UsageRecord } from "./types.js";

export function focusRecord(row: CsvRecord, options: UsageImportOptions): UsageRecord | null {
  const start = field(row, "chargeperiodstart", "billingperiodstart");
  const date = dateField(start);
  const column =
    options.costBasis === "list"
      ? "listcost"
      : options.costBasis === "billed" || (!options.costBasis && !("effectivecost" in row))
        ? "billedcost"
        : "effectivecost";
  const cost = numberField(field(row, column));
  if (!date || !Number.isFinite(Date.parse(start)) || cost == null) return null;
  const end = field(row, "chargeperiodend");
  if (end && (!dateField(end) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start))) {
    throw new UploadError("FOCUS ChargePeriodEnd must be a valid timestamp after ChargePeriodStart.");
  }
  if (
    end &&
    Number.isFinite(Date.parse(end)) &&
    new Date(Date.parse(end) - 1).toISOString().slice(0, 7) !== date.slice(0, 7)
  ) {
    throw new UploadError(
      "A FOCUS charge spans multiple calendar months. Export daily or monthly charges so costs are assigned to the correct month.",
    );
  }
  const quantity = numberField(field(row, "consumedquantity", "pricingquantity")) ?? 0;
  const skuName = field(row, "skupriceid", "skuid", "skuname", "servicename") || "UNKNOWN";
  const tags = objectField(row, "tags");
  return {
    source: "focus",
    date,
    endDate: field(row, "chargeperiodend") || undefined,
    skuName,
    billingOriginProduct: field(row, "servicename"),
    cloud: cloudField(field(row, "serviceprovidername", "providername", "publishername")),
    region: field(row, "regionid", "regionname") || undefined,
    unit: (field(row, "consumedunit", "pricingunit") || "COST").toUpperCase(),
    quantity,
    recordType: "ORIGINAL",
    cost: {
      amount: cost,
      currency: "USD",
      basis: column === "listcost" ? "list" : column === "billedcost" ? "billed" : "effective",
      source: column,
    },
    workspaceId: field(row, "subaccountid") || undefined,
    tags,
    metadata: { resource_id: field(row, "resourceid") },
    identity: {},
    features: {},
  };
}
