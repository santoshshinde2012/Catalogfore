import { useCallback, useEffect, useState } from "react";
import type { Portfolio } from "@cayfore/engine";

export type AppView = "planner" | "products" | "rates";
/** null is an explicit All choice; omitted dimensions use the plan's placement. */
export type RatePlacement = { [K in "cloud" | "region" | "tier"]?: Portfolio[K] | null };

export function readAppView(): AppView {
  if (typeof window === "undefined") return "planner";
  const view = new URL(window.location.href).searchParams.get("view");
  return view === "products" || view === "rates" ? view : "planner";
}

export function readRateProductId(): string {
  if (typeof window === "undefined" || readAppView() !== "rates") return "";
  return new URL(window.location.href).searchParams.get("product") ?? "";
}

function readRatePlacement(): RatePlacement {
  if (typeof window === "undefined" || readAppView() !== "rates") return {};
  const query = new URL(window.location.href).searchParams;
  const cloud = query.get("rateCloud");
  const tier = query.get("rateTier");
  return {
    ...(cloud === "all" ? { cloud: null } : cloud === "aws" || cloud === "azure" || cloud === "gcp" ? { cloud } : {}),
    ...(tier === "all" ? { tier: null } : tier === "premium" || tier === "enterprise" ? { tier } : {}),
    ...(query.get("rateRegion") ? { region: query.get("rateRegion") === "all" ? null : query.get("rateRegion")! } : {}),
  };
}

/** Keep view navigation separate from the portfolio stored in the URL fragment. */
export function useAppView() {
  const [view, setView] = useState<AppView>(readAppView);
  const [rateProductId, setRateProductId] = useState(readRateProductId);
  const [ratePlacement, setRatePlacement] = useState(readRatePlacement);

  useEffect(() => {
    const onPopState = () => {
      setView(readAppView());
      setRateProductId(readRateProductId());
      setRatePlacement(readRatePlacement());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((next: AppView, productId = "", placement: RatePlacement = {}, replace = false) => {
    const url = new URL(window.location.href);
    if (next !== "planner") url.searchParams.set("view", next);
    else url.searchParams.delete("view");
    if (next === "rates" && productId) url.searchParams.set("product", productId);
    else url.searchParams.delete("product");
    for (const [key, value] of Object.entries({
      rateCloud: placement.cloud,
      rateRegion: placement.region,
      rateTier: placement.tier,
    })) {
      if (next === "rates" && value !== undefined) url.searchParams.set(key, value === null ? "all" : value);
      else url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) {
      if (replace) window.history.replaceState(window.history.state, "", url);
      else window.history.pushState(null, "", url);
    }
    setView(next);
    setRateProductId(next === "rates" ? productId : "");
    setRatePlacement(next === "rates" ? placement : {});
  }, []);

  return { view, rateProductId, ratePlacement, navigate };
}
