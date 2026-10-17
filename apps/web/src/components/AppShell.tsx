import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { navigateToSection } from "../lib/page-navigation";
import { readAppView, useAppView } from "../hooks/useAppView";
import type { SimpleSession } from "../hooks/useSimpleForecast";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { SimplePage } from "./simple/SimplePage";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

const ProductMapPage = lazy(() =>
  import("./products/ProductMapPage").then((module) => ({ default: module.ProductMapPage })),
);

export function AppShell({ session }: { session: SimpleSession }) {
  const [howOpen, setHowOpen] = useState(false);
  const [advancedAsk, setAdvancedAsk] = useState(0);
  const { view, navigate } = useAppView();
  const productsOpen = view === "products";

  useEffect(() => {
    const onPopState = () => {
      const products = readAppView() === "products";
      if (products) setAdvancedAsk(0);
      requestAnimationFrame(() => navigateToSection(products ? "product-map" : "plan-inputs"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function showPlanner(id: string) {
    navigate("planner");
    if (productsOpen) requestAnimationFrame(() => navigateToSection(id));
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
          href={productsOpen ? "#product-map" : "#forecast"}
          onClick={(event) => {
            event.preventDefault();
            navigateToSection(productsOpen ? "product-map" : "forecast");
          }}
        >
          Skip to content
        </a>
        <AppHeader
          theme={session.theme}
          productMapOpen={productsOpen}
          onTheme={session.toggleTheme}
          onInputs={() => showPlanner("plan-inputs")}
          onForecast={() => showPlanner("forecast")}
          onProducts={showProducts}
          onAdvanced={showAdvanced}
          onHow={showHow}
          onOpen={(file) => {
            void session.loadForecastFile(file);
            showPlanner("plan-inputs");
          }}
          onNew={() => {
            session.reset();
            showPlanner("plan-inputs");
            toast("Started a new forecast", { description: "Use Undo last change to restore your previous plan." });
          }}
        />
        <main>
          {!productsOpen && (
            <SimplePage session={session} howOpen={howOpen} onHowOpen={setHowOpen} advancedAsk={advancedAsk} />
          )}
          {productsOpen && (
            <Suspense
              fallback={
                <p className="mx-auto max-w-6xl px-6 py-16 text-muted-foreground" role="status">
                  Loading the product map…
                </p>
              }
            >
              <ProductMapPage onAddProduct={addProduct} onBack={() => showPlanner("plan-inputs")} />
            </Suspense>
          )}
        </main>
        <AppFooter onForecast={() => showPlanner("forecast")} onProducts={showProducts} onHow={showHow} />
        <Toaster theme={session.theme} />
      </div>
    </TooltipProvider>
  );
}
