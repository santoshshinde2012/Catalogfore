import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { navigateToSection } from "../lib/page-navigation";
import { readAppView, useAppView, type RatePlacement } from "../hooks/useAppView";
import {
  ratePlacement as placementForFilters,
  referenceRateFilters,
  type RateWorkspaceDraft,
} from "../hooks/useRateWorkspace";
import type { ProductMapDraft } from "./products/ProductMapPage";
import type { SimpleSession } from "../hooks/useSimpleForecast";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { WorkspaceBoundary } from "./WorkspaceBoundary";
import { SimplePage } from "./simple/SimplePage";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

const ProductMapPage = lazy(() =>
  import("./products/ProductMapPage").then((module) => ({ default: module.ProductMapPage })),
);
const UnitCostsPage = lazy(() => import("./rates/UnitCostsPage").then((module) => ({ default: module.UnitCostsPage })));

export function AppShell({ session }: { session: SimpleSession }) {
  const [howOpen, setHowOpen] = useState(false);
  const [advancedAsk, setAdvancedAsk] = useState(0);
  const { view, rateProductId, ratePlacement, navigate } = useAppView();
  const productDraft = useRef<ProductMapDraft | undefined>(undefined);
  const rateDraft = useRef<RateWorkspaceDraft | undefined>(undefined);
  const productsOpen = view === "products";
  const ratesOpen = view === "rates";
  const contentId = productsOpen ? "product-map" : ratesOpen ? "unit-costs" : "forecast";

  useEffect(() => {
    const onPopState = () => {
      const next = readAppView();
      if (next !== "planner") setAdvancedAsk(0);
      requestAnimationFrame(() =>
        navigateToSection(next === "products" ? "product-map" : next === "rates" ? "unit-costs" : "plan-inputs"),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function showPlanner(id: string) {
    navigate("planner");
    if (view !== "planner") requestAnimationFrame(() => navigateToSection(id));
    else navigateToSection(id);
  }
  function showAdvanced() {
    navigate("planner");
    requestAnimationFrame(() => setAdvancedAsk((value) => value + 1));
  }
  function showHow() {
    setHowOpen(true);
    showPlanner("how-it-works");
  }
  function showProducts() {
    setAdvancedAsk(0);
    navigate("products");
    requestAnimationFrame(() => navigateToSection("product-map"));
  }
  function showRates(productId?: string, placement: RatePlacement = {}) {
    setAdvancedAsk(0);
    if (productId !== undefined) {
      if (rateDraft.current)
        rateDraft.current = {
          ...rateDraft.current,
          filters: referenceRateFilters(session.portfolio, productId, placement),
          selectedId: "",
          panel: "rates",
          limit: 12,
        };
      navigate("rates", productId, placement);
    } else {
      const filters = rateDraft.current?.filters;
      navigate("rates", filters?.productId ?? "", filters ? placementForFilters(filters) : {});
    }
    requestAnimationFrame(() => navigateToSection("unit-costs"));
  }
  function addProduct(id: string) {
    if (!session.addProduct(id)) return;
    showAdvanced();
    toast("Added to your forecast", {
      description: "Review the new workload in Advanced. Undo last change can restore your previous plan.",
    });
  }

  return (
    <TooltipProvider>
      <div className="min-h-svh">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          href={`#${contentId}`}
          onClick={(event) => {
            event.preventDefault();
            navigateToSection(contentId);
          }}
        >
          Skip to content
        </a>
        <AppHeader
          theme={session.theme}
          productMapOpen={productsOpen}
          unitCostsOpen={ratesOpen}
          onTheme={session.toggleTheme}
          onInputs={() => showPlanner("plan-inputs")}
          onForecast={() => showPlanner("forecast")}
          onProducts={showProducts}
          onRates={() => showRates()}
          onAdvanced={showAdvanced}
          onHow={showHow}
          onOpen={(file) => {
            void session.loadForecastFile(file);
            showPlanner("plan-inputs");
          }}
          onNew={() => {
            session.reset();
            showPlanner("plan-inputs");
            toast("Started a new forecast", { description: "Adjust the inputs to start a new estimate." });
          }}
        />
        <main>
          <WorkspaceBoundary key={view} onPlan={() => showPlanner("plan-inputs")}>
            {view === "planner" && (
              <SimplePage
                session={session}
                howOpen={howOpen}
                onHowOpen={setHowOpen}
                advancedAsk={advancedAsk}
                onReferenceCosts={showRates}
              />
            )}
            {productsOpen && (
              <Suspense
                fallback={
                  <p className="mx-auto max-w-7xl px-6 py-16 text-muted-foreground" role="status">
                    Loading the product map…
                  </p>
                }
              >
                <ProductMapPage
                  cache={productDraft}
                  onAddProduct={addProduct}
                  onInspectCosts={showRates}
                  onBack={() => showPlanner("plan-inputs")}
                />
              </Suspense>
            )}
            {ratesOpen && (
              <Suspense
                fallback={
                  <p className="mx-auto max-w-7xl px-6 py-16 text-muted-foreground" role="status">
                    Loading unit costs…
                  </p>
                }
              >
                <UnitCostsPage
                  productId={rateProductId}
                  placement={ratePlacement}
                  cache={rateDraft}
                  onScope={(filters) => navigate("rates", filters.productId ?? "", placementForFilters(filters), true)}
                  portfolio={session.portfolio}
                  onBack={() => showPlanner("plan-inputs")}
                  onViewForecast={() => showPlanner("forecast")}
                  canUndo={session.canUndo}
                  onUndo={session.undoRemove}
                  onApplyUsage={(row, quantity) => {
                    if (!session.applyUnitCost(row, quantity)) {
                      toast("Quantity kept in the calculator", {
                        description: "Review the quantity and pricing requirements shown beside the calculator.",
                      });
                      return false;
                    }
                    toast("Forecast updated", {
                      description: `${row.productName} now uses this quantity. Plan discounts still apply.`,
                      action: { label: "View forecast", onClick: () => showPlanner("forecast") },
                    });
                    return true;
                  }}
                />
              </Suspense>
            )}
          </WorkspaceBoundary>
        </main>
        <AppFooter
          onForecast={() => showPlanner("forecast")}
          onProducts={showProducts}
          onRates={() => showRates()}
          onHow={showHow}
        />
        <Toaster theme={session.theme} />
      </div>
    </TooltipProvider>
  );
}
