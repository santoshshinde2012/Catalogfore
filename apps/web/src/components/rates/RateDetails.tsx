import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { Button } from "../ui/button";
import { RateBuildUp } from "./RateBuildUp";
import { RateCalculator } from "./RateCalculator";
import { EvidenceBadge, RatePrimarySource, RateSourceEvidence } from "./RateEvidence";
import {
  dimensionLabel,
  evidenceLabels,
  placementLabel,
  rowBasis,
  rowPrice,
  statusLabels,
  unitMoney,
  variantLabel,
} from "./rate-presentation";

export function RateDetails({ row, onResults }: { row: UnitCostRow; onResults: () => void }) {
  return (
    <section
      id="rate-details"
      aria-label="Unit cost details"
      tabIndex={-1}
      className="min-w-0 self-start rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-4 lg:hidden" onClick={onResults}>
        <ArrowLeft aria-hidden="true" />
        Back to rates
      </Button>
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ReceiptText className="size-4 text-link" aria-hidden="true" />
        {row.domainName}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance">{row.productName}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{row.componentName}</p>
      {variantLabel(row) && <p className="mt-2 text-xs font-medium">{variantLabel(row)}</p>}
      <p className="mt-2 text-xs text-muted-foreground">{placementLabel(row)}</p>
      <div role="group" aria-label="Unit price and evidence" className="mt-5 rounded-xl border bg-muted/30 p-4">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {row.rateKind === "money"
            ? row.evidenceLevel === "official"
              ? "Official list price · USD"
              : "Reference unit cost · USD"
            : "Billing context"}
        </p>
        <p className="mt-2 break-words text-3xl font-semibold tabular-nums">{rowPrice(row)}</p>
        {row.rateKind !== "unpriced" && <p className="mt-1 text-sm text-muted-foreground">per {rowBasis(row)}</p>}
        {statusLabels[row.status] !== evidenceLabels[row.evidenceLevel] && (
          <p className="mt-3 text-xs">{statusLabels[row.status]}</p>
        )}
        <div className="mt-3">
          <EvidenceBadge level={row.evidenceLevel} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.evidenceSummary}</p>
        <RatePrimarySource row={row} />
      </div>
      {row.status === "unpriced" && (
        <p className="mt-3 text-sm font-medium text-destructive">A missing price is unresolved, not a free service.</p>
      )}
      <RateBuildUp row={row} />
      <div className="mt-5">
        <h3 className="text-sm font-semibold">Billing dimensions</h3>
        <dl className="mt-3 grid gap-2 text-xs">
          {row.baseRateUsd !== null && (
            <Dimension
              label="Base price"
              value={`${unitMoney(row.baseRateUsd)} / ${row.baseRateUnit ?? "basis not recorded"}`}
            />
          )}
          {row.regionFactor !== null && <Dimension label="Region multiplier" value={`${row.regionFactor}×`} />}
          {row.sourceRegion && <Dimension label="Price reference region" value={row.sourceRegion} />}
          {row.dbuPerUnit !== null && <Dimension label="Consumption" value={`${row.dbuPerUnit} DBU / ${row.unit}`} />}
          {row.usdPerUnit !== null && row.unitQuantity !== 1 && (
            <Dimension label="Per individual unit" value={`${unitMoney(row.usdPerUnit)} / ${row.unit}`} />
          )}
          {row.sku && <Dimension label="Billing SKU" value={row.sku} />}
          {Object.entries(row.dimensions)
            .filter(([key]) => key !== "aliases")
            .map(([label, value]) => (
              <Dimension
                key={label}
                label={dimensionLabel(label)}
                value={typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
              />
            ))}
        </dl>
      </div>
      <RateCalculator row={row} />
      <div className="mt-5 border-t pt-4">
        <h3 className="text-sm font-semibold">Coverage and conditions</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {row.includesCompute === true
            ? "Compute is included in this service component. Check the notes for storage, network, and other exclusions."
            : row.includesCompute === false
              ? "Cloud machine charges are separate from this component. Review compute, storage, and network costs before treating it as a complete service cost."
              : "Compute inclusion is not established for this row. This is one billing component, not an all-in quote."}
        </p>
        <ul className="mt-2 grid list-disc gap-2 pl-4 text-xs leading-relaxed text-muted-foreground">
          {[...row.conditions, ...row.notes]
            .filter((note, index, all) => all.indexOf(note) === index)
            .map((note) => (
              <li key={note}>{note}</li>
            ))}
        </ul>
        {(row.effectiveFrom || row.effectiveTo) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Effective {row.effectiveFrom ?? "start not recorded"} – {row.effectiveTo ?? "end not recorded"}.
          </p>
        )}
      </div>
      <RateSourceEvidence row={row} />
    </section>
  );
}

function Dimension({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
      <dt className="break-words text-muted-foreground">{label}</dt>
      <dd className="break-words text-right font-medium">{value}</dd>
    </div>
  );
}
