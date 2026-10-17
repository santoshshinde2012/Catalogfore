import { productCatalog, type Product } from "@cayfore/catalog";
import { annualTotal, forecast } from "./forecast.js";
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
  const points = forecast(result, { ...portfolio.forecast, months: 12 });
  const year = annualTotal(points);
  const base = result.dbuCost + result.cloudCost;
  const drafts = result.lines.map((line) => {
    const workload = portfolio.workloads.find((item) => item.id === line.workloadId);
    const product = workload?.productId ? productById(workload.productId) : undefined;
    const weight = base > 0 ? line.total / base : result.lines.length > 0 ? 1 / result.lines.length : 0;
    return {
      workloadId: line.workloadId,
      productId: workload?.productId ?? null,
      name: line.name,
      category: product?.category ?? null,
      monthly: roundMoney(line.total + result.addonCost * weight),
      year: 0,
      published: product ? product.published : null,
      listPrice: product?.listPrice ?? null,
      billingUnit: product?.billingUnit ?? null,
    };
  });
  let spent = 0;
  drafts.forEach((line, index) => {
    if (index === drafts.length - 1) line.monthly = roundMoney(result.total - spent);
    else spent = roundMoney(spent + line.monthly);
  });
  let yearSpent = 0;
  drafts.forEach((line, index) => {
    if (result.total <= 0) {
      line.year = 0;
      return;
    }
    if (index === drafts.length - 1) line.year = roundMoney(year - yearSpent);
    else {
      line.year = roundMoney((line.monthly / result.total) * year);
      yearSpent = roundMoney(yearSpent + line.year);
    }
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
  return { lines: grouped, monthly: result.total, year };
}
