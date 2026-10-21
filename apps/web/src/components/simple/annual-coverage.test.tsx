/** @vitest-environment jsdom */
import { blankPortfolio, defaultEstimateDependencies, projectPortfolio, type Portfolio } from "@cayfore/engine";
import { workloadsForProduct } from "@cayfore/engine/products";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TooltipProvider } from "../ui/tooltip";
import { ResultsPanel } from "./ForecastOutcome";

function promotionForecast(startMonth: string) {
  const catalog = defaultEstimateDependencies.catalog;
  const portfolio: Portfolio = {
    ...blankPortfolio(),
    workloads: [
      ...workloadsForProduct("genie")
        .filter((workload) => workload.partId === "llm")
        .map((workload) => ({ ...workload, inputs: { ...workload.inputs, dbuPerUser: 200 } })),
      ...workloadsForProduct("managed_storage"),
    ],
    forecast: { months: 12, annualGrowth: 0, seasonality: "flat", startMonth },
  };
  return projectPortfolio(portfolio, {
    ...defaultEstimateDependencies,
    catalog: {
      ...catalog,
      // The missing serving rate matters once the included Genie usage ends in February 2027.
      regionalSkuRate: (cloud, region, tier, sku) =>
        sku === "model_serving" ? Number.NaN : (catalog.regionalSkuRate?.(cloud, region, tier, sku) ?? null),
    },
  });
}

function renderForecast(projection: ReturnType<typeof projectPortfolio>) {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <TooltipProvider>
      <ResultsPanel projection={projection} notice="" busy={false} onShare={() => undefined} />
    </TooltipProvider>,
  );
  return host;
}

it("discloses unresolved annual charges when the first month is fully covered by a promotion", () => {
  const projection = promotionForecast("2027-01");
  expect(projection.estimate.coverage?.complete).toBe(true);
  expect(projection.estimate.coverage?.freeLines).toBe(1);
  expect(promotionForecast("2027-02").estimate.coverage?.complete).toBe(false);
  expect(projection.hasUnpriced).toBe(true);
  expect(projection.annual).toBe(138);

  const host = renderForecast(projection);
  const disclosure = [...host.querySelectorAll("p")].find(
    (element) => element.textContent === "Known subtotal · some components have unresolved prices",
  );
  expect(disclosure).toBeDefined();
  expect(disclosure?.closest('[aria-hidden="true"], .sr-only, [hidden]')).toBeNull();
  const announcement = host.querySelector('[data-testid="year-sentence"]');
  expect(announcement?.getAttribute("aria-live")).toBe("polite");
  expect(announcement?.textContent).toContain("Known annual subtotal $138; unresolved charges are excluded.");
});

it("keeps a completely covered forecast free of an unresolved-price warning", () => {
  const projection = promotionForecast("2026-01");
  expect(projection.estimate.coverage?.complete).toBe(true);
  expect(projection.hasUnpriced).toBe(false);

  const host = renderForecast(projection);
  expect(host.textContent).not.toContain("Known subtotal · some components have unresolved prices");
  expect(host.querySelector('[data-testid="year-sentence"]')?.textContent).toContain("About $138 per year.");
});
