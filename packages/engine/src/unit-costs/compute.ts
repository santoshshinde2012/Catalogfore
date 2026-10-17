import { instances, referenceRegion, skuCatalog, vmHourly, vmPrices } from "../catalog.js";
import { publishedPhotonMultiplier } from "../rates/photon.js";
import type { ClusterSku, Workload } from "../types.js";
import { append, dbuRate, monetary, placements, source, type RowContext } from "./context.js";

export function clusterRows(context: RowContext, workload: Extract<Workload, { kind: "cluster" }>) {
  const sku: ClusterSku = workload.sku;
  for (const instance of instances) {
    placements((region, tier) => {
      if (region.cloud !== instance.cloud) return;
      convertedAtPlacement(context, instance, region.id, tier, sku);
    });
    for (const region of skuCatalog.regions.filter((item) => item.cloud === instance.cloud)) {
      const quote = vmHourly(instance.cloud, region.id, instance.id);
      const raw = vmPrices.find(
        (item) => item.cloud === instance.cloud && item.region === region.id && item.instanceId === instance.id,
      );
      const sourceRegion = raw ? region.id : referenceRegion[instance.cloud];
      const vmSource = source(
        "Cloud VM price observation",
        instance.cloud === "aws"
          ? `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${sourceRegion}/index.csv`
          : instance.cloud === "azure"
            ? "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview"
            : "https://cloud.google.com/compute/vm-instance-pricing",
        "price",
        instance.id,
      );
      const observation =
        raw ??
        vmPrices.find(
          (item) => item.cloud === instance.cloud && item.region === sourceRegion && item.instanceId === instance.id,
        );
      vmSource.observedOn = observation?.source === "seed" ? null : (observation?.asOf ?? null);
      const missing = quote.source === "missing";
      monetary(context, {
        componentId: "vm",
        componentName: "Cloud VM infrastructure",
        unit: "node-hour",
        cloud: instance.cloud,
        region: region.id,
        regionLabel: region.label,
        instanceId: instance.id,
        unitPriceUsd: missing ? null : quote.hourly,
        baseRateUsd: missing ? null : quote.hourly,
        sourceRegion,
        status: missing ? "unpriced" : quote.approximate || quote.source === "seed" ? "approximate" : "priced",
        confidence: missing ? "unpublished" : quote.approximate || quote.source === "seed" ? "assumption" : "measured",
        includesCompute: true,
        variant: "on_demand",
        formula: "Node-hours × on-demand USD/node-hour",
        dimensions: { vCPU: instance.vCPU, memoryGiB: instance.memoryGiB },
        sources: [vmSource],
        notes: [
          "Add Databricks DBU charges separately; driver and workers each incur node-hours.",
          ...(quote.approximate
            ? [`Reference-region fallback from ${sourceRegion}; no exact regional observation.`]
            : []),
          ...(quote.source === "seed" ? ["Curated seed, not a freshly observed cloud quote."] : []),
        ],
      });
      if (quote.spotHourly !== null)
        monetary(context, {
          componentId: "vm",
          componentName: "Cloud VM infrastructure",
          unit: "node-hour",
          cloud: instance.cloud,
          region: region.id,
          regionLabel: region.label,
          instanceId: instance.id,
          variant: "spot",
          unitPriceUsd: quote.spotHourly,
          baseRateUsd: quote.spotHourly,
          sourceRegion,
          status: "approximate",
          confidence: instance.cloud === "aws" ? "assumption" : "measured",
          includesCompute: true,
          formula: "Worker spot node-hours × spot USD/node-hour; driver stays on demand",
          sources: [
            instance.cloud === "aws"
              ? source(
                  "AWS Spot Advisor savings estimate",
                  "https://aws.amazon.com/ec2/spot/instance-advisor/",
                  "price",
                  instance.id,
                  observation?.asOf ?? null,
                )
              : vmSource,
          ],
          notes: [
            instance.cloud === "aws"
              ? "Advisor-derived planning estimate, not a live Spot quote. Availability zone and time change actual prices."
              : "Observed regional Spot meter; capacity and billed price can change.",
            "Spot does not discount DBUs.",
          ],
        });
    }
  }
  for (const cloud of ["aws", "azure", "gcp"] as const)
    append(context, {
      componentId: "photon",
      componentName: "Photon DBU emission multiplier",
      cloud,
      unit: "multiplier",
      rateKind: "multiplier",
      value: publishedPhotonMultiplier(cloud, sku),
      status: "approximate",
      confidence: "assumption",
      formula: "Non-Photon node DBU × Photon factor; runtime is unchanged unless the schedule changes",
      dimensions: { photon: true },
      notes: ["Planning factor; instance/runtime-specific DBU ratings can differ. Apply only when Photon is enabled."],
      sources: [
        source(
          "Photon instance and pipeline tables",
          "https://azure.microsoft.com/en-us/pricing/details/databricks/",
          "consumption",
        ),
      ],
    });
}

function convertedAtPlacement(
  context: RowContext,
  instance: (typeof instances)[number],
  regionId: string,
  tier: "premium" | "enterprise",
  sku: ClusterSku,
) {
  const region = skuCatalog.regions.find((item) => item.cloud === instance.cloud && item.id === regionId)!;
  const { rate, ...price } = dbuRate(region, tier, sku);
  monetary(context, {
    ...price,
    componentId: "compute",
    componentName: "Databricks node usage",
    unit: "node-hour",
    unitPriceUsd: rate === null ? null : rate * instance.dbuPerHour,
    dbuPerUnit: instance.dbuPerHour,
    includesCompute: false,
    status: rate === null ? "unpriced" : "approximate",
    confidence: rate === null ? "conflict" : "assumption",
    instanceId: instance.id,
    variant: "non_photon",
    formula: "Node-hours × DBU/node-hour × USD/DBU",
    dimensions: { photon: false, vCPU: instance.vCPU, memoryGiB: instance.memoryGiB },
    sources: [
      ...price.sources,
      source(
        "Curated non-Photon DBU/node-hour ratings",
        instance.cloud === "azure"
          ? "https://azure.microsoft.com/en-us/pricing/details/databricks/"
          : "https://github.com/santoshshinde2012/cayfore/blob/main/data/instances.json",
        "consumption",
        instance.id,
      ),
    ],
    notes: [
      "One node-hour; include the driver plus every worker. VM infrastructure is a separate component.",
      "Instance DBU ratings are curated planning values; Photon factor is separate.",
    ],
  });
}
