import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { money } from "../../format";
import { navigateToSection } from "../../lib/page-navigation";
import { Button } from "../ui/button";

export function MobileForecastBar({ annual, incomplete }: { annual: number; incomplete: boolean }) {
  const [viewingForecast, setViewingForecast] = useState(false);
  useEffect(() => {
    const target = document.getElementById("forecast");
    if (!target || typeof IntersectionObserver === "undefined") return;
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      // A sliver below the inputs should not change the shortcut's action.
      observer = new IntersectionObserver(([entry]) => setViewingForecast(entry.isIntersecting), {
        rootMargin: `0px 0px -${Math.round(window.innerHeight / 2)}px 0px`,
      });
      observer.observe(target);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, []);
  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgb(11_32_38/0.06)] backdrop-blur lg:hidden"
      aria-label="Forecast shortcut"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{incomplete ? "Annual known subtotal" : "Next 12 months"}</p>
          <p className="truncate text-xl font-semibold tracking-tight tabular-nums">{money(annual, 0)}</p>
        </div>
        <Button
          type="button"
          size="lg"
          className="shrink-0"
          onClick={() => navigateToSection(viewingForecast ? "plan-inputs" : "forecast")}
        >
          {viewingForecast ? <ArrowUp /> : <ArrowDown />}
          {viewingForecast ? "Edit inputs" : "View forecast"}
        </Button>
      </div>
    </aside>
  );
}
