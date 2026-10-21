import { defaultInstanceId, findInstance, listRegions, type Cloud, type Tier } from "@cayfore/engine";
import { useState } from "react";
import { OptionSelect } from "../ui/option-select";
import type { KindProps } from "./fields";

export function PlacementFields({ workload, portfolio, onChange }: KindProps) {
  const [notice, setNotice] = useState("");
  const cloud = workload.cloud ?? portfolio.cloud;
  if (workload.rateProvenance?.kind === "imported")
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Cloud, region, and edition stay fixed to the imported source.
      </p>
    );
  return (
    <details className="mt-3">
      <summary>Run this workload somewhere else</summary>
      <div className="mt-2 grid-3">
        <OptionSelect
          tone="field"
          label="Cloud"
          value={workload.cloud ?? ""}
          searchable={false}
          onValueChange={(value) => {
            const nextCloud = (value || portfolio.cloud) as Cloud;
            const resetMachine = workload.kind === "cluster" && !findInstance(nextCloud, workload.instanceId);
            const region = listRegions(nextCloud).some((item) => item.id === workload.region)
              ? workload.region
              : undefined;
            onChange({
              ...workload,
              cloud: (value || undefined) as Cloud | undefined,
              region,
              ...(resetMachine ? { instanceId: defaultInstanceId(nextCloud) } : {}),
            });
            setNotice(
              resetMachine
                ? "Cloud changed. The default machine for this cloud is selected; review its size and price."
                : "Cloud changed. Review the regional rate coverage for this workload.",
            );
          }}
          options={[
            { value: "", label: "Same as portfolio" },
            { value: "aws", label: "AWS" },
            { value: "azure", label: "Azure" },
            { value: "gcp", label: "GCP" },
          ]}
        />
        <OptionSelect
          tone="field"
          label="Region"
          value={workload.region ?? ""}
          onValueChange={(region) => onChange({ ...workload, region: region || undefined })}
          options={[
            { value: "", label: cloud === portfolio.cloud ? "Same as portfolio" : "Cloud default region" },
            ...listRegions(cloud).map((region) => ({ value: region.id, label: region.label })),
          ]}
        />
        <OptionSelect
          tone="field"
          label="Tier"
          value={workload.tier ?? ""}
          searchable={false}
          onValueChange={(tier) => onChange({ ...workload, tier: (tier || undefined) as Tier | undefined })}
          options={[
            { value: "", label: "Same as portfolio" },
            { value: "premium", label: "Premium" },
            { value: "enterprise", label: "Enterprise" },
          ]}
        />
      </div>
      {notice && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {notice}
        </p>
      )}
    </details>
  );
}
