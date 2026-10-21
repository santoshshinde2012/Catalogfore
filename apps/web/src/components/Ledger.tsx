import {
  defaultInstanceId,
  findInstance,
  skuCatalog,
  type Estimate,
  type Portfolio,
  type Workload,
} from "@cayfore/engine";
import { forecastProducts, productById, workloadsForProduct } from "@cayfore/engine/products";
import { useRef } from "react";
import { money } from "../format";
import { Editor } from "./Editor";
import { LedgerMenu } from "./LedgerMenu";

interface LedgerProps {
  portfolio: Portfolio;
  estimate: Estimate;
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onUsageFile: (file: File) => void;
}

export function Ledger({ portfolio, estimate, selectedId, onPortfolio, onSelect, onRemove, onUsageFile }: LedgerProps) {
  const ledgerRef = useRef<HTMLDivElement>(null);
  const selected = portfolio.workloads.find((workload) => workload.id === selectedId) ?? null;
  const breakdown = forecastProducts(estimate, portfolio);
  function restoreFocus(id?: string) {
    requestAnimationFrame(() => {
      const rows = ledgerRef.current?.querySelectorAll<HTMLButtonElement>("button[data-workload-id]");
      const target =
        [...(rows ?? [])].find((row) => row.dataset.workloadId === id) ??
        ledgerRef.current?.querySelector<HTMLButtonElement>("button[aria-controls]");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  }
  function update(workload: Workload) {
    onPortfolio({
      ...portfolio,
      workloads: portfolio.workloads.map((item) => (item.id === workload.id ? workload : item)),
    });
  }

  function add(productId: string) {
    const added = workloadsForProduct(productId).map((workload) =>
      workload.kind === "cluster" && !findInstance(portfolio.cloud, workload.instanceId)
        ? { ...workload, instanceId: defaultInstanceId(portfolio.cloud) }
        : workload,
    );
    onPortfolio({ ...portfolio, workloads: [...portfolio.workloads, ...added] });
    onSelect(added[0]?.id ?? null);
  }

  return (
    <div ref={ledgerRef} className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Workloads</h2>
        <LedgerMenu onAdd={add} onUsageFile={onUsageFile} />
      </div>

      <div className="grid gap-2">
        {portfolio.workloads.map((workload) => {
          const line = estimate.lines.find((item) => item.workloadId === workload.id);
          const product = workload.productId ? productById(workload.productId) : undefined;
          const subtitle = product
            ? product.listPrice === "unpublished"
              ? "No list rate is published"
              : product.billingUnit
            : (skuCatalog.skuLabels[line?.sku as keyof typeof skuCatalog.skuLabels] ?? line?.sku);
          const gap = line?.notes.find((note) => /not priced|No list rate is stored/i.test(note));
          return (
            <button
              key={workload.id}
              data-workload-id={workload.id}
              type="button"
              className={
                workload.id === selectedId
                  ? "rounded-lg border border-primary bg-primary/5 px-3 py-3 text-left"
                  : "rounded-lg border px-3 py-3 text-left hover:bg-muted"
              }
              aria-pressed={workload.id === selectedId}
              onClick={() => onSelect(workload.id)}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">{workload.name}</span>
                  <span className="block text-xs text-muted-foreground">{subtitle}</span>
                  {gap && <span className="block text-xs text-muted-foreground">{gap}</span>}
                </span>
                <span className="text-sm font-medium tabular-nums">{money(line?.total ?? 0)}</span>
              </span>
            </button>
          );
        })}
        {breakdown.lines.length > 0 && (
          <div className="rounded-lg border px-3 py-3">
            <h3 className="text-sm font-medium">By product</h3>
            <p className="text-xs text-muted-foreground">
              This month, and the next 12 months at this portfolio’s growth.
            </p>
            <div className="mt-2 grid gap-2">
              {breakdown.lines.map((line) => (
                <div key={line.workloadId} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="block font-medium">{line.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {line.listPrice === "unpublished"
                        ? "No list rate is published"
                        : (line.billingUnit ?? "This month")}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="block">{money(line.monthly)}</span>
                    <span className="block text-xs text-muted-foreground">{money(line.year)} / 12 mo</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-sm font-medium">
              <span>Total</span>
              <span className="text-right tabular-nums">
                <span className="block">{money(breakdown.monthly)}</span>
                <span className="block text-xs font-normal text-muted-foreground">{money(breakdown.year)} / 12 mo</span>
              </span>
            </div>
          </div>
        )}
        {portfolio.workloads.length === 0 && (
          <div className="rounded-lg border border-dashed px-3 py-4">
            <p className="text-sm font-medium">No workloads yet.</p>
            <p className="text-sm text-muted-foreground">
              Add a job or a warehouse. The month total updates as you edit.
            </p>
          </div>
        )}
      </div>

      {selected && (
        <Editor
          workload={selected}
          portfolio={portfolio}
          onChange={update}
          onDuplicate={() => {
            const copy = { ...selected, id: crypto.randomUUID().slice(0, 8), name: `${selected.name} copy` };
            onPortfolio({ ...portfolio, workloads: [...portfolio.workloads, copy] });
            onSelect(copy.id);
          }}
          onRemove={() => {
            const index = portfolio.workloads.findIndex((item) => item.id === selected.id);
            const next = portfolio.workloads[index + 1] ?? portfolio.workloads[index - 1];
            onRemove(selected.id);
            restoreFocus(next?.id);
          }}
          onClose={() => {
            onSelect(null);
            restoreFocus(selected.id);
          }}
        />
      )}
    </div>
  );
}
