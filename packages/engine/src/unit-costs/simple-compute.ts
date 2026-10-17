import { skuCatalog } from "../catalog.js";
import type { Workload } from "../types.js";
import { converted, dbuComponent, monetary, source, type RowContext } from "./context.js";

export function simpleComputeRows(context: RowContext, workload: Workload): boolean {
  if (workload.kind === "serverless_compute") {
    dbuComponent(context, workload.sku);
    return true;
  }
  if (workload.kind === "sql") {
    const sku =
      workload.edition === "pro" ? "sql_pro" : workload.edition === "classic" ? "sql_classic" : "sql_serverless";
    for (const [size, count] of Object.entries(skuCatalog.sqlDbuPerHour)) {
      converted(
        context,
        sku,
        {
          componentId: "compute",
          componentName: "SQL warehouse compute",
          variant: size,
          unit: "warehouse-hour",
          formula: "Warehouse-hours × size DBU/hour × USD/DBU",
          dimensions: { size },
          notes: ["One warehouse cluster; multiply by active clusters. Storage and networking remain separate."],
        },
        count,
      );
      if (workload.edition !== "serverless")
        monetary(context, {
          componentId: "sql_vm",
          componentName: "SQL infrastructure equivalence",
          unit: "warehouse-hour",
          variant: size,
          unitPriceUsd: count * skuCatalog.sqlVmDollarsPerDbuHour,
          baseRateUsd: skuCatalog.sqlVmDollarsPerDbuHour,
          baseRateUnit: "DBU infrastructure-equivalent",
          dimensions: { size, warehouseDbuPerHour: count },
          formula: "Warehouse-hours × size DBU/hour × assumed USD/DBU infrastructure",
          includesCompute: true,
          notes: [skuCatalog.sqlVmNote, "Planning assumption shared across clouds; not a cloud VM tariff."],
          sources: [
            source(
              "SQL warehouse infrastructure assumption",
              "https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-behavior",
              "context",
            ),
          ],
        });
    }
    return true;
  }
  if (workload.kind === "app") {
    for (const [size, count] of Object.entries(skuCatalog.appsDbuPerHour))
      converted(
        context,
        "apps",
        {
          componentId: "compute",
          componentName: "App compute",
          variant: size,
          unit: "app-hour",
          formula: "App-hours × size DBU/hour × USD/DBU",
          dimensions: { size },
        },
        count,
      );
    return true;
  }
  return false;
}
