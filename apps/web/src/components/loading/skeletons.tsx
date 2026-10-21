import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

function LoadingShell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="relative h-60 lg:h-48" role="status" aria-live="polite" aria-busy="true">
      <Skeleton className="absolute inset-0 rounded-lg" />
      <p className="relative px-3 py-2 text-sm text-muted-foreground">Loading chart</p>
    </div>
  );
}

export function ProductMapSkeleton() {
  return (
    <LoadingShell label="Loading the product map" className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <Skeleton className="mb-3 h-4 w-36 rounded-md" />
      <Skeleton className="mb-4 h-10 w-72 max-w-full rounded-lg" />
      <Skeleton className="mb-5 h-11 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-2.5">
        {["e", "f", "g", "h"].map((key) => (
          <Skeleton key={key} className="h-24 rounded-xl" />
        ))}
      </div>
    </LoadingShell>
  );
}

export function UnitCostsSkeleton() {
  return (
    <LoadingShell
      label="Loading the price catalog"
      className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6"
    >
      <Skeleton className="mb-3 h-8 w-28 rounded-lg" />
      <Skeleton className="mb-2 h-10 w-64 max-w-full rounded-lg" />
      <Skeleton className="mb-5 h-4 w-full max-w-xl rounded-md" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <Skeleton key={key} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-5 h-11 w-full rounded-xl" />
      <RatesTableSkeleton />
    </LoadingShell>
  );
}

export function RatesTableSkeleton() {
  return (
    <LoadingShell label="Loading the rates table" className="min-h-96 border-y py-3">
      <Skeleton className="mx-3 mb-3 h-8 rounded-md" />
      {["a", "b", "c", "d", "e", "f", "g", "h"].map((key) => (
        <Skeleton key={key} className="mx-3 mb-2 h-11 rounded-md" />
      ))}
    </LoadingShell>
  );
}
