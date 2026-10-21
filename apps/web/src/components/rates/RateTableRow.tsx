import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { evidenceLabels, rowBasis, rowPrice, statusLabels, variantLabel } from "./rate-presentation";

const cell = "border-b border-border/60 px-3 py-2 align-top break-words";
const sourceRoles = {
  price: "Price",
  consumption: "Usage",
  region: "Region",
  context: "Context",
};

export function RateTableRow({ row, onInspect }: { row: UnitCostRow; onInspect?: (row: UnitCostRow) => void }) {
  const source = row.sources.find((item) => item.role === "price") ?? row.sources[0];
  const variant = variantLabel(row);
  return (
    <tr data-row-id={row.id} className="group text-xs leading-relaxed hover:bg-muted/35">
      <th scope="row" className={`${cell} sticky left-0 z-10 bg-card text-left font-normal group-hover:bg-muted`}>
        {onInspect ? (
          <button
            type="button"
            aria-label={`Inspect ${row.productName}: ${row.componentName}`}
            onClick={() => onInspect(row)}
            className="-my-1 inline-flex min-h-11 items-center gap-2 text-left text-[13px] font-semibold underline-offset-4 hover:text-link hover:underline"
          >
            {row.productName}
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : (
          <span className="text-[13px] font-semibold">{row.productName}</span>
        )}
        <span className="block text-muted-foreground">{row.componentName}</span>
        {variant && <span className="mt-1 block text-muted-foreground">{variant}</span>}
      </th>
      <td className={cell}>{row.cloud?.toUpperCase() ?? "Shared context"}</td>
      <td className={cell}>
        {row.regionLabel ?? row.region ?? "Not region-specific"}
        {row.regionLabel && row.region && <span className="mt-1 block text-muted-foreground">{row.region}</span>}
      </td>
      <td className={`${cell} capitalize`}>{row.tier ?? "Not specified"}</td>
      <td className={`${cell} text-right`}>
        <span className="block font-mono text-[13px] font-medium tabular-nums">{rowPrice(row)}</span>
        <span className="mt-1 block text-muted-foreground">
          {row.rateKind === "money" && row.unitPriceUsd === 0 ? "Zero-price component" : statusLabels[row.status]}
        </span>
      </td>
      <td className={cell}>{rowBasis(row)}</td>
      <td className={cell}>
        <span className={row.evidenceLevel === "official" ? "font-medium" : "text-muted-foreground"}>
          {evidenceLabels[row.evidenceLevel]}
        </span>
        <span className="mt-1 block text-muted-foreground capitalize">{row.confidence}</span>
      </td>
      <td className={cell}>
        {source ? (
          <>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="-my-1 inline-flex min-h-11 flex-wrap items-center gap-x-1.5 font-medium text-link underline-offset-4 hover:underline"
            >
              {source.publisher}
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              <span className="text-xs font-normal text-muted-foreground">{sourceRoles[source.role]}</span>
              <span className="sr-only"> — {source.title} (opens in a new tab)</span>
            </a>
            <span className="block text-xs text-muted-foreground">
              {source.observedOn ? `Observed ${source.observedOn}` : "No price observation"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {source.reviewedOn ? `Reviewed ${source.reviewedOn}` : "Review not recorded"}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">No source recorded</span>
        )}
      </td>
    </tr>
  );
}
