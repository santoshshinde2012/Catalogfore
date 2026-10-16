import { defaultInstanceId, skuCatalog, type Estimate, type Portfolio, type Workload } from "@dcf/engine";
import { useEffect, useId, useRef, useState } from "react";
import { money } from "../format";
import { MENU, createWorkload, type MenuKind } from "../templates";
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
  const groups = [...new Set(MENU.map((item) => item.group))];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  function update(workload: Workload) {
    onPortfolio({
      ...portfolio,
      workloads: portfolio.workloads.map((item) => (item.id === workload.id ? workload : item)),
    });
  }

  function add(kind: MenuKind) {
    const workload = createWorkload(kind);
    if (workload.kind === "cluster") workload.instanceId = defaultInstanceId(portfolio.cloud);
    onPortfolio({ ...portfolio, workloads: [...portfolio.workloads, workload] });
    onSelect(workload.id);
    setMenuOpen(false);
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
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            size="sm"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Add
          </Button>
          {menuOpen && (
            <div
              id={menuId}
              className="absolute right-0 z-20 mt-2 max-h-[70vh] w-80 overflow-auto rounded-lg border bg-popover p-2 shadow-lg"
            >
              {groups.map((group) => (
                <div key={group}>
                  <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">{group}</div>
                  {MENU.filter((item) => item.group === group).map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                      onClick={() => add(item.kind)}
                    >
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.blurb}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {portfolio.workloads.map((workload) => {
          const line = estimate.lines.find((item) => item.workloadId === workload.id);
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
                  <span className="block text-xs text-muted-foreground">
                    {skuCatalog.skuLabels[line?.sku as keyof typeof skuCatalog.skuLabels] ?? line?.sku}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">{money(line?.total ?? 0)}</span>
              </span>
            </button>
          );
        })}
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
