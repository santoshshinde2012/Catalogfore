import { defaultInstanceId, skuCatalog, type Estimate, type Portfolio, type Workload } from "@cayfore/engine";
import {
  forecastProducts,
  listProducts,
  productById,
  productCategories,
  workloadsForProduct,
  workloadsFromUsage,
} from "@cayfore/engine/products";
import { useEffect, useId, useRef, useState } from "react";
import { money } from "../format";
import { Editor } from "./Editor";
import { Button } from "./ui/button";

interface LedgerProps {
  portfolio: Portfolio;
  estimate: Estimate;
  selectedId: string | null;
  onPortfolio: (portfolio: Portfolio) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}

export function Ledger({ portfolio, estimate, selectedId, onPortfolio, onSelect, onRemove }: LedgerProps) {
  const selected = portfolio.workloads.find((workload) => workload.id === selectedId) ?? null;
  const categories = productCategories();
  const breakdown = forecastProducts(estimate, portfolio);
  const [menuOpen, setMenuOpen] = useState(false);
  const [usageNote, setUsageNote] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  function update(workload: Workload) {
    onPortfolio({
      ...portfolio,
      workloads: portfolio.workloads.map((item) => (item.id === workload.id ? workload : item)),
    });
  }

  function add(productId: string) {
    const added = workloadsForProduct(productId).map((workload) =>
      workload.kind === "cluster" ? { ...workload, instanceId: defaultInstanceId(portfolio.cloud) } : workload,
    );
    onPortfolio({ ...portfolio, workloads: [...portfolio.workloads, ...added] });
    onSelect(added[0]?.id ?? null);
    setMenuOpen(false);
  }

  function onUsageFile(file: File) {
    file.text().then((text) => {
      const loaded = workloadsFromUsage(text);
      if (!loaded.workloads.length) {
        setUsageNote(loaded.warnings[0] ?? "That file did not contain mapped usage rows.");
        return;
      }
      onPortfolio({ ...portfolio, workloads: [...portfolio.workloads, ...loaded.workloads] });
      onSelect(loaded.workloads[0]?.id ?? null);
      const skipped = loaded.unmapped.length ? ` ${loaded.unmapped.length} sku names were not mapped.` : "";
      setUsageNote(`Added ${loaded.workloads.length} products from the usage file.${skipped}`);
    });
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Workloads</h2>
        <div className="relative flex gap-2" ref={menuRef}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Usage CSV"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUsageFile(file);
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            From a usage file
          </Button>
          <Button
            type="button"
            size="sm"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Add product
          </Button>
          {menuOpen && (
            <div
              id={menuId}
              className="absolute right-0 z-20 mt-2 max-h-[70vh] w-80 overflow-auto rounded-lg border bg-popover p-2 shadow-lg"
            >
              {categories.map((category) => (
                <div key={category.id}>
                  <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">{category.label}</div>
                  {listProducts()
                    .filter((item) => item.category === category.id)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                        onClick={() => add(item.id)}
                      >
                        <span className="block text-sm font-medium">{item.menuLabel}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.summary}
                          {item.listPrice === "unpublished" ? " · No list rate is published" : ""}
                        </span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {usageNote && (
        <p className="text-xs text-muted-foreground" role="status">
          {usageNote}
        </p>
      )}

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
          onRemove={() => onRemove(selected.id)}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  );
}
