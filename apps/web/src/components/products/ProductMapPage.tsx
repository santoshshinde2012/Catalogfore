import { filterMapEntries, productMap, type ProductMapEntry } from "@cayfore/catalog/map";
import { ArrowDown, ArrowLeft, BookOpen, Network } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navigateToSection } from "../../lib/page-navigation";
import { Button } from "../ui/button";
import { DomainOverview } from "./DomainOverview";
import { LearningJourneys } from "./LearningJourneys";
import { ProductDetails } from "./ProductDetails";
import { ProductDirectory } from "./ProductDirectory";

function sortEntries(a: ProductMapEntry, b: ProductMapEntry): number {
  return Number(Boolean(a.product)) - Number(Boolean(b.product)) || a.name.localeCompare(b.name);
}

export function ProductMapPage({ onAddProduct, onBack }: { onAddProduct: (id: string) => void; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [domainId, setDomainId] = useState("");
  const [kind, setKind] = useState("");
  const [selectedId, setSelectedId] = useState("unity_catalog");
  const [limit, setLimit] = useState(12);
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
    setQuery("");
    setDomainId("");
    setKind("");
    setLimit(12);
  }
  function select(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => navigateToSection("product-details"));
  }
  function explore(id: string) {
    clear();
    const all = [...productMap.entries].sort(sortEntries);
    setLimit(Math.max(12, all.findIndex((entry) => entry.id === id) + 1));
    select(id);
  }
  return (
    <article className="mx-auto w-full max-w-6xl px-4 pt-7 pb-12 sm:px-6 lg:pb-16">
      <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-5 text-muted-foreground" onClick={onBack}>
        <ArrowLeft />
        Back to planner
      </Button>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <Network className="size-4 text-link" aria-hidden="true" />
            Databricks, made understandable
          </p>
          <h1
            id="product-map"
            tabIndex={-1}
            className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            One platform. Find your way.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Explore products, services, and the domains they belong to. See what each does, how the pieces connect, and
            where costs come from.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-11"
            onClick={() => navigateToSection("product-directory")}
          >
            <ArrowDown />
            Browse products and services
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-xl border bg-card px-3 py-2">
            <strong className="font-semibold text-foreground">
              {productMap.entries.filter((entry) => entry.product).length}
            </strong>{" "}
            catalog entries
          </span>
          <span className="rounded-xl border bg-card px-3 py-2">
            <strong className="font-semibold text-foreground">
              {productMap.entries.filter((entry) => !entry.product).length}
            </strong>{" "}
            platform concepts
          </span>
        </div>
      </header>
      <div className="grid gap-6">
        <DomainOverview
          selected={domainId}
          onSelect={(id) => {
            setDomainId(id);
            setLimit(12);
          }}
        />
        <LearningJourneys onSelectEntry={explore} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ProductDirectory
            entries={entries}
            selectedId={selected?.id}
            query={query}
            domainId={domainId}
            kind={kind}
            limit={limit}
            onQuery={(value) => {
              setQuery(value);
              setLimit(12);
            }}
            onDomain={(value) => {
              setDomainId(value);
              setLimit(12);
            }}
            onKind={(value) => {
              setKind(value);
              setLimit(12);
            }}
            onSelect={select}
            onMore={() => setLimit((value) => value + 12)}
            onClear={clear}
          />
          {selected && (
            <ProductDetails
              key={selected.id}
              entry={selected}
              onAdd={onAddProduct}
              onSelect={explore}
              onResults={() => navigateToSection("product-directory")}
            />
          )}
        </div>
        <aside className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          <BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{productMap.disclaimer}</p>
        </aside>
      </div>
    </article>
  );
}
