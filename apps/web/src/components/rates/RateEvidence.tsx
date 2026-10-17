import type { UnitCostRow, UnitCostSource } from "@cayfore/engine/unit-costs";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { evidenceLabels } from "./rate-presentation";

export function EvidenceBadge({ level }: { level: UnitCostRow["evidenceLevel"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[11px] leading-relaxed font-medium",
        level === "official" || level === "derived" ? "bg-primary/5" : "border-dashed text-muted-foreground",
      )}
    >
      {evidenceLabels[level]}
    </span>
  );
}

export function RateEvidenceOverview({ rows }: { rows: UnitCostRow[] }) {
  const counts = new Map<UnitCostRow["evidenceLevel"], number>();
  for (const row of rows) counts.set(row.evidenceLevel, (counts.get(row.evidenceLevel) ?? 0) + 1);
  return (
    <section aria-label="Evidence coverage" className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-link" aria-hidden="true" />
        Understand the evidence behind these rates
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Counts describe the current filtered rows. A price does not confirm product availability in your region.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(evidenceLabels).map(([level, label]) => (
          <div key={level} className="flex min-w-0 flex-col rounded-xl border bg-muted/20 p-3">
            <dt className="order-2 mt-1 text-[11px] leading-relaxed text-muted-foreground">{label}</dt>
            <dd className="order-1 text-xl font-semibold tabular-nums">
              {(counts.get(level as UnitCostRow["evidenceLevel"]) ?? 0).toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>
      <details className="mt-4 border-t pt-3">
        <summary className="cursor-pointer text-xs font-semibold">
          <BookOpen className="mr-2 inline size-3.5 align-text-bottom" aria-hidden="true" />
          How to read the sources
        </summary>
        <div className="mt-3 grid gap-3 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            <strong className="font-medium text-foreground">Official list price</strong> means a first-party numeric
            price matches the billing dimension. <strong className="font-medium text-foreground">Derived</strong>{" "}
            applies published consumption rules or eligible conditions. A monetary value combines those rules with
            first-party prices.
          </p>
          <p>
            <strong className="font-medium text-foreground">Planning estimate</strong> includes assumptions, regional
            proxies, seeded values, and third-party references. An official documentation link can explain a service
            without establishing its numeric price.
          </p>
          <p>
            <strong className="font-medium text-foreground">Unresolved</strong> means a price is missing or sources
            conflict. <strong className="font-medium text-foreground">Platform context</strong> explains a service with
            no standalone rate in this catalog; underlying workloads can still incur charges.
          </p>
          <p>
            <strong className="font-medium text-foreground">Observation and review dates are separate.</strong> A
            reviewed website does not refresh the stored price snapshot. Public list prices can differ from your
            contract, invoice, taxes, and separately billed components.
          </p>
        </div>
      </details>
    </section>
  );
}

const authorityLabels: Record<UnitCostSource["authority"], string> = {
  first_party: "Official publisher",
  secondary: "Third-party reference",
  project: "Cayfore assumption",
  unknown: "Unverified publisher",
};
const roleLabels: Record<UnitCostSource["role"], string> = {
  price: "Price evidence",
  consumption: "Consumption rule",
  region: "Regional adjustment",
  context: "Background documentation",
};

function sourceWebsite(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "Source URL unavailable";
  }
}

export function RatePrimarySource({ row }: { row: UnitCostRow }) {
  const source = row.sources.find((reference) => reference.role === "price") ?? row.sources[0];
  if (!source) return null;
  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {roleLabels[source.role]} · {authorityLabels[source.authority]}
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex min-h-9 items-start gap-2 text-xs leading-relaxed text-link underline-offset-4 hover:underline"
      >
        <span className="min-w-0 break-words">
          {source.publisher} · {sourceWebsite(source.url)}
        </span>
        <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        <span className="sr-only"> — {source.title} (opens in a new tab)</span>
      </a>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {source.observedOn ? `Snapshot observed ${source.observedOn}` : "No price observation recorded"}
        {source.reviewedOn ? ` · Source reviewed ${source.reviewedOn}` : ""}
      </p>
    </div>
  );
}

export function RateSourceEvidence({ row }: { row: UnitCostRow }) {
  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="text-sm font-semibold">Source evidence</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Check the source role and billing scope. Background documentation alone does not verify a numeric rate.
      </p>
      <ul className="mt-3 grid gap-3">
        {row.sources.map((source, index) => (
          <li key={`${source.url}-${source.role}-${index}`} className="min-w-0 rounded-xl border bg-muted/20 p-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed">
              <span className="font-semibold">{source.publisher}</span>
              <span className="text-muted-foreground">{authorityLabels[source.authority]}</span>
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-h-9 items-start gap-2 text-xs leading-relaxed text-link underline-offset-4 hover:underline"
            >
              <span className="min-w-0 break-words">{source.title}</span>
              <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="break-words text-[11px] leading-relaxed text-muted-foreground">
              {roleLabels[source.role]} · {sourceWebsite(source.url)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {source.observedOn
                ? `Snapshot observed ${source.observedOn}`
                : source.role === "price"
                  ? "Price snapshot date not recorded"
                  : "Documentation reference"}
              {source.reviewedOn ? ` · Source reviewed ${source.reviewedOn}` : " · Review date not recorded"}
            </p>
            {source.locator && (
              <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{source.locator}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
