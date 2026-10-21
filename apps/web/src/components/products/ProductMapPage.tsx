import { filterMapEntries, productMap, type ProductMapEntry } from "@cayfore/catalog/map";
import { ArrowLeft, BookOpen, Network } from "lucide-react";
import { useEffect, useMemo, type RefObject } from "react";
import { navigateToSection } from "../../lib/page-navigation";
import { useWorkspaceDraft } from "../../hooks/workspace-draft";
import { Button } from "../ui/button";
import { DomainOverview } from "./DomainOverview";
import { LearningJourneys } from "./LearningJourneys";
import { ProductDetails } from "./ProductDetails";
import { ProductDirectory } from "./ProductDirectory";
import { ProductFilters } from "./ProductFilters";

function sortEntries(a: ProductMapEntry, b: ProductMapEntry): number {
  return Number(Boolean(a.product)) - Number(Boolean(b.product)) || a.name.localeCompare(b.name);
}

export interface ProductMapDraft {
  query: string;
  domainId: string;
  kind: string;
  selectedId: string;
  limit: number;
}

export function ProductMapPage({
  onAddProduct,
  onInspectCosts,
  onBack,
  cache,
}: {
  onAddProduct: (id: string) => void;
  onInspectCosts: (id: string) => void;
  onBack: () => void;
  cache: RefObject<ProductMapDraft | undefined>;
}) {
  const [{ query, domainId, kind, selectedId, limit }, setDraft] = useWorkspaceDraft(cache, () => ({
    query: "",
    domainId: "",
    kind: "",
    selectedId: "",
    limit: 12,
  }));
  const patch = (next: Partial<ProductMapDraft>) => setDraft((previous) => ({ ...previous, ...next }));
  const entries = useMemo(
    () =>
      filterMapEntries({
        query,
        domainId: domainId || undefined,
        kind: kind ? (kind as ProductMapEntry["kind"]) : undefined,
      }).sort(sortEntries),
    [query, domainId, kind],
  );
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];
  useEffect(() => {
    navigateToSection("product-map");
  }, []);
  function clear() {
    patch({ query: "", domainId: "", kind: "", limit: 12 });
  }
  function select(id: string) {
    patch({ selectedId: id });
    requestAnimationFrame(() => navigateToSection("product-details"));
  }
  function explore(id: string) {
    clear();
    const all = [...productMap.entries].sort(sortEntries);
    patch({ limit: Math.max(12, all.findIndex((entry) => entry.id === id) + 1) });
    select(id);
  }
  return (
    <article className="mx-auto w-full max-w-7xl px-4 pt-5 pb-12 sm:px-6 lg:pb-16">
      <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground" onClick={onBack}>
        <ArrowLeft />
        Back to planner
      </Button>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <Network className="size-4 text-link" aria-hidden="true" />
            Databricks platform guide
          </p>
          <h1
            id="product-map"
            tabIndex={-1}
            className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Product map
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Find a service, understand its role, and follow the source of its costs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-lg border bg-card px-3 py-2">
            <strong className="font-semibold text-foreground">
              {productMap.entries.filter((entry) => entry.product).length}
            </strong>{" "}
            catalog entries
          </span>
          <span className="rounded-lg border bg-card px-3 py-2">
            <strong className="font-semibold text-foreground">
              {productMap.entries.filter((entry) => !entry.product).length}
            </strong>{" "}
            platform concepts
          </span>
        </div>
      </header>
      <div className="grid gap-6">
        <ProductFilters
          query={query}
          domainId={domainId}
          kind={kind}
          hasFilters={Boolean(query || domainId || kind)}
          onQuery={(value) => {
            patch({ query: value, limit: 12 });
          }}
          onDomain={(value) => {
            patch({ domainId: value, limit: 12 });
          }}
          onKind={(value) => {
            patch({ kind: value, limit: 12 });
          }}
          onClear={clear}
        />
        <DomainOverview
          selected={domainId}
          onSelect={(id) => {
            patch({ domainId: id, limit: 12 });
          }}
        />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <ProductDirectory
            entries={entries}
            selectedId={selected?.id}
            limit={limit}
            hasFilters={Boolean(query || domainId || kind)}
            onSelect={select}
            onMore={() => patch({ limit: limit + 12 })}
            onClear={clear}
          />
          {selected && (
            <ProductDetails
              key={selected.id}
              entry={selected}
              onAdd={onAddProduct}
              onInspectCosts={onInspectCosts}
              onSelect={explore}
              onResults={() => navigateToSection("product-directory")}
            />
          )}
        </div>
        <LearningJourneys onSelectEntry={explore} />
        <aside className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          <BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{productMap.disclaimer}</p>
        </aside>
      </div>
    </article>
  );
}
