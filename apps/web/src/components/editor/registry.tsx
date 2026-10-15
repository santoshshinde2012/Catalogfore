import type { ComponentType } from "react";
import type { Workload } from "@dcf/engine";
import { AppFields, DbuMeterFields, EgressFields, LakebaseFields, SearchFields, StorageFields } from "./MeterFields";
import { ClusterFields } from "./ClusterFields";
import { FoundationFields, ServingFields } from "./ServingFields";
import { ServerlessFields } from "./ServerlessFields";
import { SqlFields } from "./SqlFields";
import type { KindProps } from "./fields";

/** Presentational editors. A new workload kind registers here and does not edit the shell. */
export const workloadEditors: Record<Workload["kind"], ComponentType<KindProps>> = {
  cluster: ClusterFields,
  serverless_compute: ServerlessFields,
  sql: SqlFields,
  model_serving: ServingFields,
  foundation_model: FoundationFields,
  ai_search: SearchFields,
  app: AppFields,
  lakebase: LakebaseFields,
  storage: StorageFields,
  egress: EgressFields,
  metered: DbuMeterFields,
};
