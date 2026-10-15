import { defaultInstanceId, skuCatalog, type Estimate, type Portfolio, type Workload } from "@dcf/engine";
import { useEffect, useId, useRef, useState } from "react";
import { money } from "../format";
import { MENU, createWorkload, type MenuKind } from "../templates";
import { Editor } from "./Editor";

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
    <div className="workloads">
      <div className="ledger-head">
        <h2>Workloads</h2>
        <div className="add-menu" ref={menuRef}>
          <button
            type="button"
            className="add-trigger"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Add
          </button>
          {menuOpen && (
            <div className="add-panel" id={menuId}>
              {groups.map((group) => (
                <div key={group}>
                  <div className="add-group">{group}</div>
                  {MENU.filter((item) => item.group === group).map((item) => (
                    <button key={item.kind} type="button" className="add-item" onClick={() => add(item.kind)}>
                      <strong>{item.label}</strong>
                      <span>{item.blurb}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="entry-list">
        {portfolio.workloads.map((workload) => {
          const line = estimate.lines.find((item) => item.workloadId === workload.id);
          return (
            <button
              key={workload.id}
              type="button"
              className={workload.id === selectedId ? "entry is-selected" : "entry"}
              aria-pressed={workload.id === selectedId}
              onClick={() => onSelect(workload.id)}
            >
              <span className="entry-row">
                <span>
                  <span className="entry-name">{workload.name}</span>
                  <span className="entry-meta block">
                    {skuCatalog.skuLabels[line?.sku as keyof typeof skuCatalog.skuLabels] ?? line?.sku}
                  </span>
                </span>
                <span className="entry-cost">{money(line?.total ?? 0)}</span>
              </span>
            </button>
          );
        })}
        {portfolio.workloads.length === 0 && (
          <div className="empty">
            <p className="entry-name">Nothing is on this forecast yet.</p>
            <p className="hint">Add a job or a warehouse. The month updates as you type.</p>
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
