import { productById, recomputeProduct } from "@cayfore/engine/products";
import { listRegions, type Cloud, type Portfolio, type Tier, type Workload } from "@cayfore/engine";
import { SchemaFields } from "./editor/SchemaFields";
import { workloadEditors } from "./editor/registry";
import { Button } from "./ui/button";

interface EditorProps {
  workload: Workload;
  portfolio: Portfolio;
  onChange: (workload: Workload) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function Editor({ workload, portfolio, onChange, onDuplicate, onRemove, onClose }: EditorProps) {
  const cloud = workload.cloud ?? portfolio.cloud;
  const product = workload.productId ? productById(workload.productId) : undefined;
  const part = product?.parts?.find((item) => item.id === workload.partId);
  const editor = part?.editor ?? product?.editor;
  const fields = part?.fields ?? product?.fields ?? [];
  const schema = editor === "schema";
  const Fields = workloadEditors[workload.kind];
  function change(next: Workload) {
    onChange(recomputeProduct(next));
  }
  return (
    <div className="mt-2 rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <strong className="text-sm">Edit workload</strong>
        <span className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </span>
      </div>
      <div className="grid-2">
        <label className="field">
          Name
          <input
            value={workload.name}
            maxLength={80}
            onChange={(event) => change({ ...workload, name: event.target.value })}
          />
        </label>
        <SkuSelect workload={workload} onChange={change} />
      </div>
      {schema && product ? (
        <SchemaFields workload={workload} fields={fields} onChange={change} />
      ) : (
        <Fields workload={workload} portfolio={portfolio} onChange={change} />
      )}
      {product && <p className="hint mt-3">{product.note}</p>}
      <details className="mt-3">
        <summary>Run this workload somewhere else</summary>
        <div className="mt-2 grid-3">
          <label className="field">
            Cloud
            <select
              value={workload.cloud ?? ""}
              onChange={(event) =>
                change({ ...workload, cloud: (event.target.value || undefined) as Cloud | undefined })
              }
            >
              <option value="">Same as portfolio</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </label>
          <label className="field">
            Region
            <select
              value={workload.region ?? ""}
              onChange={(event) => change({ ...workload, region: event.target.value || undefined })}
            >
              <option value="">Same as portfolio</option>
              {listRegions(cloud).map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tier
            <select
              value={workload.tier ?? ""}
              onChange={(event) => change({ ...workload, tier: (event.target.value || undefined) as Tier | undefined })}
            >
              <option value="">Same as portfolio</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}

function SkuSelect({ workload, onChange }: { workload: Workload; onChange: (workload: Workload) => void }) {
  if (workload.kind === "cluster") {
    return (
      <label className="field">
        SKU
        <select
          value={workload.sku}
          onChange={(event) => onChange({ ...workload, sku: event.target.value as typeof workload.sku })}
        >
          <option value="jobs_classic">Jobs classic</option>
          <option value="all_purpose_classic">All-purpose classic</option>
          <option value="dlt_core">Pipelines Core</option>
          <option value="dlt_pro">Pipelines Pro</option>
          <option value="dlt_advanced">Pipelines Advanced</option>
        </select>
      </label>
    );
  }
  if (workload.kind === "serverless_compute") {
    return (
      <label className="field">
        SKU
        <select
          value={workload.sku}
          onChange={(event) => onChange({ ...workload, sku: event.target.value as typeof workload.sku })}
        >
          <option value="jobs_serverless">Jobs serverless</option>
          <option value="all_purpose_serverless">Notebooks serverless</option>
          <option value="dlt_serverless">Pipelines serverless</option>
        </select>
      </label>
    );
  }
  if (workload.kind === "sql") {
    return (
      <label className="field">
        Edition
        <select
          value={workload.edition}
          onChange={(event) => onChange({ ...workload, edition: event.target.value as typeof workload.edition })}
        >
          <option value="classic">Classic</option>
          <option value="pro">Pro</option>
          <option value="serverless">Serverless</option>
        </select>
      </label>
    );
  }
  return null;
}
