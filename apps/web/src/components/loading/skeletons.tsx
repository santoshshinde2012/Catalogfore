import { LoaderCircle } from "lucide-react";
import { skeletonLayouts, type SkeletonId } from "../../services/skeleton-layouts";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

function Groups({ id }: { id: SkeletonId }) {
  const layout = skeletonLayouts[id];
  return (
    <>
      {layout.groups.map((group, index) => (
        <div key={`${id}-${index}`} className={group.className}>
          {group.bars.map((className, bar) => (
            <Skeleton key={`${id}-${index}-${bar}`} className={className} />
          ))}
        </div>
      ))}
      {layout.nested && <LayoutSkeleton id={layout.nested} />}
    </>
  );
}

/** One skeleton renderer. The layout registry decides the shape. */
export function LayoutSkeleton({ id }: { id: SkeletonId }) {
  const layout = skeletonLayouts[id];
  return (
    <div className={layout.className} role="status" aria-live="polite" aria-busy="true">
      {layout.overlay ? (
        <>
          <Groups id={id} />
          <p className="relative px-3 py-2 text-sm text-muted-foreground">{layout.label}</p>
        </>
      ) : (
        <>
          <p
            className={
              layout.spinner
                ? "flex items-center gap-2 text-sm text-muted-foreground"
                : "mb-3 text-sm font-medium text-muted-foreground"
            }
          >
            {layout.spinner && (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            )}
            {layout.label}
          </p>
          <Groups id={id} />
        </>
      )}
    </div>
  );
}

export function ChartSkeleton() {
  return <LayoutSkeleton id="chart" />;
}

export function ProductMapSkeleton() {
  return <LayoutSkeleton id="products" />;
}

export function UnitCostsSkeleton() {
  return <LayoutSkeleton id="rates" />;
}

export function RatesTableSkeleton() {
  return <LayoutSkeleton id="rates-table" />;
}

export function AdvancedSkeleton() {
  return <LayoutSkeleton id="advanced" />;
}
