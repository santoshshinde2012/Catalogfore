import { UploadError } from "../untrusted.js";
import { cloudField, dateField, field, numberField, objectField, type CsvRecord } from "./fields.js";
import type { UsageImportOptions, UsageRecord } from "./types.js";

const METADATA = [
  "job_id",
  "job_run_id",
  "warehouse_id",
  "pipeline_id",
  "endpoint_name",
  "app_id",
  "cluster_id",
  "usage_policy_id",
];
const IDENTITY = ["run_as", "owned_by", "created_by"];

export function systemRecord(row: CsvRecord, options: UsageImportOptions): UsageRecord | null {
  const quantity = numberField(field(row, "usage_quantity", "dbus", "dbu"));
  if (quantity == null) return null;
  const rawDate = field(row, "usage_date", "date", "usage_start_time");
  const date = dateField(rawDate);
  if (rawDate && !date) return null;
  const listPrice = numberField(field(row, "list_price", "price", "pricing_default"));
  const effectiveListPrice = numberField(
    field(row, "effective_list_price", "effective_list", "pricing.effective_list.default"),
  );
  if ((listPrice != null && listPrice < 0) || (effectiveListPrice != null && effectiveListPrice < 0))
    throw new UploadError("A list price cannot be negative; use signed usage quantities for corrections.");
  const useEffective = options.costBasis !== "list" && effectiveListPrice != null;
  const price = useEffective ? effectiveListPrice : listPrice;
  if (price != null && !Number.isFinite(quantity * price))
    throw new UploadError("The usage quantity multiplied by its price exceeds the supported numeric range.");
  const recordType = field(row, "record_type").toUpperCase();
  const cloudRaw = field(row, "cloud");
  if (cloudRaw && !cloudField(cloudRaw))
    throw new UploadError(`Unsupported cloud ${cloudRaw}; use AWS, Azure, or GCP.`);
  return {
    source: "system-billing",
    recordId: field(row, "record_id") || undefined,
    ingestionDate: dateField(field(row, "ingestion_date")) ?? undefined,
    date,
    skuName: field(row, "sku_name", "sku") || "UNKNOWN",
    billingOriginProduct: field(row, "billing_origin_product"),
    cloud: cloudField(field(row, "cloud")),
    region: field(row, "region", "region_id") || undefined,
    unit: (field(row, "usage_unit", "unit") || "DBU").toUpperCase(),
    quantity,
    recordType: recordType === "RETRACTION" || recordType === "RESTATEMENT" ? recordType : "ORIGINAL",
    ...(listPrice != null ? { listPrice } : {}),
    ...(effectiveListPrice != null ? { effectiveListPrice } : {}),
    ...(price != null
      ? {
          cost: {
            amount: quantity * price,
            currency: "USD",
            basis: useEffective ? "effective-list" : "list",
            source: useEffective ? "exported effective_list_price" : "exported list_price",
          } as const,
        }
      : {}),
    workspaceId: field(row, "workspace_id") || undefined,
    tags: objectField(row, "custom_tags"),
    metadata: objectField(row, "usage_metadata", METADATA),
    identity: objectField(row, "identity_metadata", IDENTITY),
    features: objectField(row, "product_features"),
  };
}
