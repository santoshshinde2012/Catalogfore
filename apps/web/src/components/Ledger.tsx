import { defaultInstanceId, findInstance, regionInfo, skuCatalog, type Estimate, type Portfolio, type Workload } from "@dcf/engine";
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
  const region = regionInfo(portfolio.cloud, portfolio.region);

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
    <div className="ledger" id="desk">
      <section className="assumptions" aria-label="Portfolio assumptions">
        <label className="field">
          Forecast name
          <input value={portfolio.name} maxLength={80} onChange={(event) => onPortfolio({ ...portfolio, name: event.target.value })} />
        </label>
        <div className="grid-3">
          <label className="field">
            Cloud
            <select
              value={portfolio.cloud}
              onChange={(event) => onPortfolio(moveCloud(portfolio, event.target.value as Portfolio["cloud"]))}
            >
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </label>
          <label className="field">
            Region
            <select value={portfolio.region} onChange={(event) => onPortfolio({ ...portfolio, region: event.target.value })}>
              {skuCatalog.regions
                .filter((region) => region.cloud === portfolio.cloud)
                .map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Tier
            <select value={portfolio.tier} onChange={(event) => onPortfolio({ ...portfolio, tier: event.target.value as Portfolio["tier"] })}>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
        </div>
        <p className="hint">{regionHint(region.source)}</p>
        <div className="grid-3">
          <label className="field">
            DBU commit (0–0.95)
            <input
              type="number"
              min={0}
              max={0.95}
              step={0.01}
              value={portfolio.commitment.dbuDiscount}
              onChange={(event) =>
                onPortfolio({
                  ...portfolio,
                  commitment: { ...portfolio.commitment, dbuDiscount: Number(event.target.value) },
                })
              }
            />
          </label>
          <label className="field">
            VM commit (on-demand)
            <input
              type="number"
              min={0}
              max={0.95}
              step={0.01}
              value={portfolio.commitment.cloudDiscount}
              onChange={(event) =>
                onPortfolio({
                  ...portfolio,
                  commitment: { ...portfolio.commitment, cloudDiscount: Number(event.target.value) },
                })
              }
            />
          </label>
          <label className="field">
            Add-on
            <select value={portfolio.addon} onChange={(event) => onPortfolio({ ...portfolio, addon: event.target.value as Portfolio["addon"] })}>
              <option value="none">None</option>
              <option value="compliance">Compliance +10%</option>
              <option value="mission_critical">Mission critical +30%</option>
            </select>
          </label>
        </div>
      </section>

      <div className="ledger-head">
        <h2 className="section-label">Workloads</h2>
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
                  <span className="entry-meta block">{skuCatalog.skuLabels[line?.sku as keyof typeof skuCatalog.skuLabels] ?? line?.sku}</span>
                </span>
                <span className="entry-cost">{money(line?.total ?? 0)}</span>
              </span>
            </button>
          );
        })}
        {portfolio.workloads.length === 0 && <p className="hint">No workloads yet. Add one, or start from a template.</p>}
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

function regionHint(source: string): string {
  if (source === "reference") return "Reference region. DBU rates are the catalog list, factor 1.";
  if (source === "proxy") return "This region factor is a proxy. It is not a published tariff for every SKU.";
  return "DBU rates scale by the published Lakehouse Real-Time ratio versus the reference region. That ratio is for one SKU and is applied here as a proxy.";
}

function moveCloud(portfolio: Portfolio, cloud: Portfolio["cloud"]): Portfolio {
  const regions = skuCatalog.regions.filter((region) => region.cloud === cloud);
  const region = regions.some((item) => item.id === portfolio.region) ? portfolio.region : regions[0].id;
  return {
    ...portfolio,
    cloud,
    region,
    workloads: portfolio.workloads.map((workload) => {
      if (workload.kind !== "cluster" || workload.cloud) return workload;
      if (findInstance(cloud, workload.instanceId)) return workload;
      return { ...workload, instanceId: defaultInstanceId(cloud) };
    }),
  };
}
