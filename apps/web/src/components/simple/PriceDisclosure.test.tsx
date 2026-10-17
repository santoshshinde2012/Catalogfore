/** @vitest-environment jsdom */
import { blankPortfolio, estimate } from "@cayfore/engine";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PriceDisclosure } from "./PriceDisclosure";

function quoted() {
  const portfolio = blankPortfolio();
  portfolio.workloads = [
    {
      id: "job",
      name: "Azure job",
      kind: "metered",
      sku: "jobs_serverless",
      dbuPerMonth: 100,
      productId: "jobs_serverless",
      cloud: "azure",
      region: "eastus",
      tier: "enterprise",
    },
  ];
  return { portfolio, result: estimate(portfolio) };
}

it("exposes HTTPS provenance while treating imported unsafe source labels as text", () => {
  const { result } = quoted();
  const source = "https://docs.databricks.com/aws/en/admin/system-tables/billing";
  result.lines[0].rateProvenance = { kind: "imported", currency: "USD", label: "Imported rate", source };
  expect(renderToStaticMarkup(<PriceDisclosure estimate={result} />)).toContain(`href="${source}"`);
  for (const unsafe of [
    "javascript:alert(1)",
    "data:text/html,test",
    "http://example.com/rate",
    "https://user:secret@example.com/",
  ]) {
    result.lines[0].rateProvenance.source = unsafe;
    expect(renderToStaticMarkup(<PriceDisclosure estimate={result} />)).not.toContain("View rate provenance source");
  }
});

it("opens catalog references using each workload's placement without editing the portfolio", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const { portfolio, result } = quoted();
  const before = structuredClone(portfolio);
  const onReferenceCosts = vi.fn();
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    act(() =>
      root.render(<PriceDisclosure estimate={result} portfolio={portfolio} onReferenceCosts={onReferenceCosts} />),
    );
    const trigger = host.querySelector("button")!;
    act(() => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onReferenceCosts).toHaveBeenCalledWith("jobs_serverless", {
      cloud: "azure",
      region: "eastus",
      tier: "enterprise",
    });
    expect(portfolio).toEqual(before);
    expect(host.textContent).toContain("Custom rates and imported billed or effective amounts can differ");
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
