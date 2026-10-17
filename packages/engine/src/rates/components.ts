import type { Cloud, Workload } from "../types.js";

/** Reviewed native component prices. Monetary values live here, not in workload example quantities. */
export const AZURE_REFERENCE_COMPONENTS = {
  jobs_light: {
    componentId: "dbu",
    name: "Jobs Light usage",
    unit: "DBU",
    usdPerUnit: 0.22,
    meterName: "Premium Jobs Light Compute DBU",
  },
  clean_rooms: {
    componentId: "collaborator",
    name: "Clean Rooms collaborator",
    unit: "collaborator-day",
    usdPerUnit: 50,
    meterName: "Premium Clean Rooms Collaborator Collaborator",
  },
  data_processed: {
    componentId: "networking",
    name: "Data Processed",
    unit: "GB",
    usdPerUnit: 0.02,
    meterName: "Data Processed",
  },
} as const;

export const AZURE_COMPONENT_SCOPE = {
  cloud: "azure",
  region: "eastus",
  regionLabel: "East US",
  observedOn: "2026-10-17",
  sourceUrl: "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview",
} as const;

/** Published consumption is distinct from editable example monthly DBUs. */
export const FIXED_CONSUMPTION: Readonly<Record<string, { dbu: number; unit: string; basis?: number }>> = {
  ai_gateway_tables: { dbu: 7.143, unit: "GB" },
  ai_gateway_tracking: { dbu: 1.429, unit: "GB" },
  ai_search_reranker: { dbu: 28.571, unit: "request", basis: 1000 },
  shutterstock: { dbu: 0.857, unit: "image" },
};

/** Midpoints are planning assumptions within the published complexity bands. */
export const PARSE_DBU_PER_PAGE: Readonly<Record<string, number>> = {
  simple: 12.5,
  caption: 22.5,
  medium: 62.5,
  high: 87.5,
};
export const SERVING_DBU_PER_CONCURRENT_REQUEST_HOUR = 1;
export const SERVING_DBU_PER_LAUNCH = 1;
export const PROVISIONED_MODEL_UNITS_PER_BLOCK = 50;

export function azureReferenceComponent(productId: string | undefined) {
  return productId && Object.hasOwn(AZURE_REFERENCE_COMPONENTS, productId)
    ? AZURE_REFERENCE_COMPONENTS[productId as keyof typeof AZURE_REFERENCE_COMPONENTS]
    : null;
}

export function componentMatchesPlacement(cloud: Cloud, region: string): boolean {
  return cloud === AZURE_COMPONENT_SCOPE.cloud && region === AZURE_COMPONENT_SCOPE.region;
}

/** Product constructors seed public reference prices; saved or customer-supplied amounts are separate inputs. */
export function withComponentDefaults(workload: Workload): Workload {
  if (workload.kind !== "metered") return workload;
  const reference = azureReferenceComponent(workload.productId);
  const provenance = reference
    ? {
        rateProvenance: {
          kind: "catalog" as const,
          label: "Azure East US public component rate",
          currency: "USD" as const,
          source: AZURE_COMPONENT_SCOPE.sourceUrl,
          verifiedOn: AZURE_COMPONENT_SCOPE.observedOn,
        },
      }
    : {};
  if (workload.productId === "jobs_light")
    return { ...workload, ...provenance, rateByCloud: { azure: AZURE_REFERENCE_COMPONENTS.jobs_light.usdPerUnit } };
  if (workload.productId === "clean_rooms")
    return {
      ...workload,
      ...provenance,
      units: 1,
      fixedUsdByCloud: { azure: AZURE_REFERENCE_COMPONENTS.clean_rooms.usdPerUnit },
    };
  return { ...workload, ...provenance };
}
