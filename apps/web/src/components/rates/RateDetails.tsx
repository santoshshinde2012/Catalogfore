import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowLeft, ExternalLink, ReceiptText } from "lucide-react";
import { Button } from "../ui/button";
import { RateCalculator } from "./RateCalculator";
import {
  dimensionLabel,
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
      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {row.rateKind === "money" ? "Source unit cost · USD" : "Billing context"}
        </p>
        <p className="mt-2 break-words text-3xl font-semibold tabular-nums">{rowPrice(row)}</p>
        {row.rateKind !== "unpriced" && <p className="mt-1 text-sm text-muted-foreground">per {rowBasis(row)}</p>}
        <p className="mt-3 text-xs">
          {statusLabels[row.status]} · {row.confidence} evidence
        </p>
      </div>
      {row.status === "unpriced" && (
        <p className="mt-3 text-sm font-medium text-destructive">A missing price is unresolved, not a free service.</p>
      )}
      <div className="mt-5">
        <h3 className="text-sm font-semibold">How this is calculated</h3>
        <p className="mt-2 break-words rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed">
          {row.formula}
        </p>
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
      <div className="mt-5 border-t pt-4">
        <h3 className="text-sm font-semibold">Source evidence</h3>
        <ul className="mt-3 grid gap-3">
          {row.sources.map((source, index) => (
            <li key={`${source.url}-${source.role}-${index}`}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-7 items-start gap-2 text-xs leading-relaxed text-link underline-offset-4 hover:underline"
              >
                <span className="min-w-0 break-words">{source.title}</span>
                <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {source.role} evidence · observed {source.observedOn ?? "date not recorded"}
                {source.locator ? ` · ${source.locator}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
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
