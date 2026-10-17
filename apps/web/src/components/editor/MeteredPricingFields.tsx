import { type Workload } from "@cayfore/engine";
import { Button } from "../ui/button";
import { type KindProps } from "./fields";

type Metered = Extract<Workload, { kind: "metered" }>;

export function MeteredPricingFields({ workload, portfolio, onChange }: KindProps) {
  if (workload.kind !== "metered") return null;
  const cloud = workload.cloud ?? portfolio.cloud;
  const imported = workload.rateProvenance?.kind === "imported";
  if (imported)
    return (
      <div className="mt-3 grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Imported baseline</p>
        <p>
          {workload.inputs?.usageQuantity ?? workload.dbuPerMonth} {workload.inputs?.usageUnit ?? "DBU"}
        </p>
        {workload.fixedUsdByCloud?.[cloud] != null && (
          <p className="font-mono">USD {workload.fixedUsdByCloud[cloud]?.toFixed(2)} per month</p>
        )}
        <p className="text-xs text-muted-foreground">
          {workload.rateProvenance?.label}. Imported amounts stay unchanged. Use a dated planned change to model growth
          or retirement, or add a separate modeled workload.
        </p>
      </div>
    );
  if (workload.fixedUsdByCloud)
    return (
      <label className="field mt-3">
        Monthly custom cost (USD)
        <input
          type="number"
          min={0}
          step={0.01}
          value={workload.fixedUsdByCloud[cloud] ?? 0}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value >= 0)
              onChange({
                ...workload,
                fixedUsdByCloud: { ...workload.fixedUsdByCloud, [cloud]: value },
                priceStatus: undefined,
                rateProvenance: { kind: "custom", label: "User supplied monthly cost", currency: "USD" },
              });
          }}
        />
      </label>
    );
  return (
    <details className="mt-3 rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">Contract rate override</summary>
      <p className="mt-2 text-xs text-muted-foreground">
        An explicit USD rate for this cloud. This is a user assumption and travels with saved forecasts and links.
      </p>
      <label className="field mt-3">
        USD per DBU
        <input
          type="number"
          min={0}
          step={0.001}
          placeholder="Use catalog"
          value={workload.rateProvenance?.kind === "custom" ? (workload.rateByCloud?.[cloud] ?? "") : ""}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (event.target.value === "") return onChange(withoutCustomRate(workload));
            if (Number.isFinite(value) && value >= 0)
              onChange({
                ...workload,
                rateByCloud: { [cloud]: value },
                rateByPlacement: undefined,
                priceStatus: undefined,
                rateProvenance: {
                  kind: "custom",
                  label:
                    workload.rateProvenance?.kind === "custom"
                      ? workload.rateProvenance.label
                      : "User supplied contract rate",
                  currency: "USD",
                },
              });
          }}
        />
      </label>
      {workload.rateProvenance?.kind === "custom" && (
        <>
          <label className="field mt-3">
            Rate source
            <input
              maxLength={160}
              value={workload.rateProvenance.label}
              onChange={(event) =>
                onChange({ ...workload, rateProvenance: { ...workload.rateProvenance!, label: event.target.value } })
              }
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onChange(withoutCustomRate(workload))}
          >
            Use catalog rate
          </Button>
        </>
      )}
    </details>
  );
}

function withoutCustomRate(workload: Metered): Metered {
  const next = { ...workload };
  delete next.rateByCloud;
  delete next.rateByPlacement;
  delete next.rateProvenance;
  delete next.priceStatus;
  return next;
}
