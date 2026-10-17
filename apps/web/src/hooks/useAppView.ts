import { useCallback, useEffect, useState } from "react";

export type AppView = "planner" | "products";

export function readAppView(): AppView {
  if (typeof window === "undefined") return "planner";
  return new URL(window.location.href).searchParams.get("view") === "products" ? "products" : "planner";
}

/** Keep view navigation separate from the portfolio stored in the URL fragment. */
export function useAppView() {
  const [view, setView] = useState<AppView>(readAppView);

  useEffect(() => {
    const onPopState = () => setView(readAppView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((next: AppView) => {
    const url = new URL(window.location.href);
    if (next === "products") url.searchParams.set("view", "products");
    else url.searchParams.delete("view");
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    setView(next);
  }, []);

  return { view, navigate };
}
