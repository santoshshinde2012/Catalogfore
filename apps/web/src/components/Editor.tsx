import { productById, recomputeProduct } from "@cayfore/engine/products";
import { listRegions, type Cloud, type Portfolio, type Tier, type Workload } from "@cayfore/engine";
import { useEffect, useRef } from "react";
import { SchemaFields } from "./editor/SchemaFields";
import { MeteredPricingFields } from "./editor/MeteredPricingFields";
import { workloadEditors } from "./editor/registry";
import { Button } from "./ui/button";
import { OptionSelect } from "./ui/option-select";

interface EditorProps {
  workload: Workload;
  portfolio: Portfolio;
  onChange: (workload: Workload) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function Editor({ workload, portfolio, onChange, onDuplicate, onRemove, onClose }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      nameRef.current?.focus({ preventScroll: true });
      editorRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [workload.id]);
  const cloud = workload.cloud ?? portfolio.cloud;
  const product = workload.productId ? productById(workload.productId) : undefined;
  const part = product?.parts?.find((item) => item.id === workload.partId);
  const editor = part?.editor ?? product?.editor;
  const fields = part?.fields ?? product?.fields ?? [];
  const imported = workload.rateProvenance?.kind === "imported";
  const schema = editor === "schema" && !imported;
  const Fields = workloadEditors[workload.kind];
  function change(next: Workload) {
    onChange(imported ? next : recomputeProduct(next));
  }
  return (
    <div
      ref={editorRef}
      className="mt-2 min-w-0 scroll-mt-4 rounded-lg border p-4"
      role="group"
      aria-label={`Edit ${workload.name}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm">Edit workload</strong>
        <span className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-8" onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-8" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="destructive" size="sm" className="min-h-11 sm:min-h-8" onClick={onRemove}>
            Remove
          </Button>
        </span>
      </div>
      <div className="grid-2">
        <label className="field">
          Name
          <input
            ref={nameRef}
            value={workload.name}
            maxLength={80}
            onChange={(event) => change({ ...workload, name: event.target.value })}
          />
        </label>
        <SkuSelect workload={workload} onChange={change} />
      </div>
      {imported ? (
        <MeteredPricingFields workload={workload} portfolio={portfolio} onChange={change} />
      ) : schema && product ? (
        <SchemaFields workload={workload} fields={fields} onChange={change} />
      ) : (
        <Fields workload={workload} portfolio={portfolio} onChange={change} />
      )}
      {!schema && !imported && workload.kind === "metered" && (
        <MeteredPricingFields workload={workload} portfolio={portfolio} onChange={change} />
      )}
      {product && <p className="hint mt-3">{product.note}</p>}
      <details className="mt-3">
        <summary>Run this workload somewhere else</summary>
        <div className="mt-2 grid-3">
          <OptionSelect
            tone="field"
            label="Cloud"
            value={workload.cloud ?? ""}
            searchable={false}
            onValueChange={(cloud) => change({ ...workload, cloud: (cloud || undefined) as Cloud | undefined })}
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
            onValueChange={(region) => change({ ...workload, region: region || undefined })}
            options={[
              { value: "", label: "Same as portfolio" },
              ...listRegions(cloud).map((region) => ({ value: region.id, label: region.label })),
            ]}
          />
          <OptionSelect
            tone="field"
            label="Tier"
            value={workload.tier ?? ""}
            searchable={false}
            onValueChange={(tier) => change({ ...workload, tier: (tier || undefined) as Tier | undefined })}
            options={[
              { value: "", label: "Same as portfolio" },
              { value: "premium", label: "Premium" },
              { value: "enterprise", label: "Enterprise" },
            ]}
          />
        </div>
      </details>
    </div>
  );
}

function SkuSelect({ workload, onChange }: { workload: Workload; onChange: (workload: Workload) => void }) {
  if (workload.kind === "cluster") {
    return (
      <OptionSelect
        tone="field"
        label="SKU"
        value={workload.sku}
        searchable={false}
        onValueChange={(sku) => onChange({ ...workload, sku: sku as typeof workload.sku })}
        options={[
          { value: "jobs_classic", label: "Jobs classic" },
          { value: "all_purpose_classic", label: "All-purpose classic" },
          { value: "dlt_core", label: "Pipelines Core" },
          { value: "dlt_pro", label: "Pipelines Pro" },
          { value: "dlt_advanced", label: "Pipelines Advanced" },
        ]}
      />
    );
  }
  if (workload.kind === "serverless_compute") {
    return (
      <OptionSelect
        tone="field"
        label="SKU"
        value={workload.sku}
        searchable={false}
        onValueChange={(sku) => onChange({ ...workload, sku: sku as typeof workload.sku })}
        options={[
          { value: "jobs_serverless", label: "Jobs serverless" },
          { value: "all_purpose_serverless", label: "Notebooks serverless" },
          { value: "dlt_serverless", label: "Pipelines serverless" },
        ]}
      />
    );
  }
  if (workload.kind === "sql") {
    return (
      <OptionSelect
        tone="field"
        label="Edition"
        value={workload.edition}
        searchable={false}
        onValueChange={(edition) => onChange({ ...workload, edition: edition as typeof workload.edition })}
        options={[
          { value: "classic", label: "Classic" },
          { value: "pro", label: "Pro" },
          { value: "serverless", label: "Serverless" },
        ]}
      />
    );
  }
  return null;
}
