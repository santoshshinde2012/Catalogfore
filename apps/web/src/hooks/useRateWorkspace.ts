import type { Portfolio } from "@cayfore/engine";
import type { UnitCostFilters } from "@cayfore/engine/unit-costs";
import { useEffect, type RefObject } from "react";
import type { RatePlacement } from "./useAppView";
import { useWorkspaceDraft } from "./workspace-draft";

export interface RateWorkspaceDraft {
  filters: UnitCostFilters;
  selectedId: string;
  limit: number;
  panel: string;
  quantities: Record<string, string>;
}

export function ratePlacement(filters: UnitCostFilters): RatePlacement {
  return {
    cloud: filters.cloud === "aws" || filters.cloud === "azure" || filters.cloud === "gcp" ? filters.cloud : null,
    region: filters.region ?? null,
    tier: filters.tier === "premium" || filters.tier === "enterprise" ? filters.tier : null,
  };
}

function scopeKey(filters: UnitCostFilters): string {
  return JSON.stringify([filters.productId ?? "", filters.cloud ?? "", filters.region ?? "", filters.tier ?? ""]);
}

export function referenceRateFilters(
  portfolio: Portfolio,
  productId: string,
  placement: RatePlacement,
): UnitCostFilters {
  return {
    productId: productId || undefined,
    cloud: placement.cloud === null ? undefined : (placement.cloud ?? portfolio.cloud),
    region: placement.region === null ? undefined : (placement.region ?? portfolio.region),
    tier: placement.tier === null ? undefined : (placement.tier ?? portfolio.tier),
  };
}

export function useRateWorkspace({
  cache,
  portfolio,
  productId,
  placement = {},
  onScope,
}: {
  cache: RefObject<RateWorkspaceDraft | undefined>;
  portfolio: Portfolio;
  productId: string;
  placement?: RatePlacement;
  onScope: (filters: UnitCostFilters) => void;
}) {
  const route = referenceRateFilters(portfolio, productId, placement);
  const [draft, setDraft] = useWorkspaceDraft<RateWorkspaceDraft>(cache, () => ({
    filters: route,
    selectedId: "",
    limit: 12,
    panel: "rates",
    quantities: {},
  }));
  const routeKey = scopeKey(route);
  // Record inferred placement before the plan can change on another workspace.
  useEffect(() => {
    if (placement.cloud === undefined || placement.region === undefined || placement.tier === undefined) {
      onScope(route);
    }
  }, [placement.cloud, placement.region, placement.tier, onScope, route]);
  // Browser history and explicit reference links override a retained browsing scope.
  useEffect(() => {
    const [productId, cloud, region, tier] = JSON.parse(routeKey) as string[];
    setDraft((previous) =>
      scopeKey(previous.filters) === routeKey
        ? previous
        : {
            ...previous,
            filters: {
              productId: productId || undefined,
              cloud: (cloud || undefined) as UnitCostFilters["cloud"],
              region: region || undefined,
              tier: (tier || undefined) as UnitCostFilters["tier"],
            },
            selectedId: "",
            panel: "rates",
            limit: 12,
          },
    );
  }, [routeKey, setDraft]);

  function change(filters: UnitCostFilters) {
    setDraft((previous) => ({ ...previous, filters, limit: 12 }));
    onScope(filters);
  }
  return { draft, setDraft, change };
}
