import { productCatalog, type Product } from "@cayfore/catalog";
import { annualTotal } from "./forecast.js";
import { forecastPortfolioMonths } from "./forecast/portfolio.js";
import { roundMoney } from "./money.js";
import type { Estimate, Portfolio } from "./types.js";

export interface ProductForecastLine {
  workloadId: string;
  productId: string | null;
  name: string;
  category: string | null;
  monthly: number;
  year: number;
  published: boolean | null;
  listPrice: Product["listPrice"] | null;
  billingUnit: string | null;
}

export interface ProductForecast {
  lines: ProductForecastLine[];
  monthly: number;
  year: number;
}

function productById(id: string): Product | undefined {
  return productCatalog.products.find((product) => product.id === id);
}

/** Per-workload month and the next 12 months, using the portfolio's growth and seasonality. */
export function forecastProducts(result: Estimate, portfolio: Portfolio): ProductForecast {
  const months = forecastPortfolioMonths(
    { ...portfolio, forecast: { ...portfolio.forecast, months: 12 } },
    undefined,
    result,
  );
  const year = annualTotal(months.map((month) => month.point));
  const drafts = result.lines.map((line) => {
    const workload = portfolio.workloads.find((item) => item.id === line.workloadId);
    const product = workload?.productId ? productById(workload.productId) : undefined;
    return {
      workloadId: line.workloadId,
      productId: workload?.productId ?? null,
      name: line.name,
      category: product?.category ?? null,
      monthly: 0,
      year: 0,
      published: product ? product.published : null,
      listPrice: product?.listPrice ?? null,
      billingUnit: product?.billingUnit ?? null,
    };
  });
  months.forEach((month, monthIndex) => {
    let allocated = 0;
    drafts.forEach((line, index) => {
      const priced = month.estimate.lines.find((item) => item.workloadId === line.workloadId);
      const weight =
        month.estimate.total !== 0 ? (priced?.total ?? 0) / (month.estimate.dbuCost + month.estimate.cloudCost) : 0;
      const amount =
        index === drafts.length - 1
          ? roundMoney(month.point.total - allocated)
          : roundMoney(weight * month.point.total);
      allocated = roundMoney(allocated + amount);
      if (monthIndex === 0) line.monthly = amount;
      line.year = roundMoney(line.year + amount);
    });
  });
  const grouped: ProductForecastLine[] = [];
  for (const line of drafts) {
    const key = line.productId ?? line.workloadId;
    const existing = grouped.find((item) => (item.productId ?? item.workloadId) === key);
    if (!existing) {
      const product = line.productId ? productById(line.productId) : undefined;
      grouped.push({ ...line, name: product?.name ?? line.name });
      continue;
    }
    existing.monthly = roundMoney(existing.monthly + line.monthly);
    existing.year = roundMoney(existing.year + line.year);
  }
  return { lines: grouped, monthly: months[0].point.total, year };
}
