import { productCatalog, type Product } from "@cayfore/catalog";
import { annualTotal } from "./forecast.js";
import { forecastPortfolioMonths } from "./forecast/portfolio.js";
import { roundMoney } from "./money.js";
import { isNetImportedRate } from "./pricing-basis.js";
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
    // A projection estimate already includes events active in its first month.
    // Reprice from the workloads when events exist so they are applied once.
    portfolio.events?.length ? undefined : result,
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
    const priced = drafts.map((line) => month.estimate.lines.find((item) => item.workloadId === line.workloadId));
    const dbu = allocateRounded(
      priced.map((line) => (line?.dbuCost ?? 0) * month.factor),
      month.point.dbuCost,
    );
    const cloud = allocateRounded(
      priced.map((line) => (line?.cloudCost ?? 0) * month.factor),
      month.point.cloudCost,
    );
    const addons = allocateRounded(
      priced.map((line) =>
        line && !isNetImportedRate(line.rateProvenance) ? line.dbuCost * month.addonRate * month.factor : 0,
      ),
      month.point.addonCost,
    );
    drafts.forEach((line, index) => {
      const amount = roundMoney(dbu[index] + cloud[index] + addons[index]);
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

/** Reconcile each cost component among its contributors, preserving zero lines and charge/credit signs. */
function allocateRounded(amounts: number[], total: number): number[] {
  const cents = amounts.map((amount) => Math.round(amount * 100));
  let remaining = Math.round(total * 100) - cents.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(remaining) || cents.some((value) => !Number.isSafeInteger(value)))
    return amounts.map(roundMoney);
  const direction = Math.sign(remaining);
  const order = amounts
    .map((_, index) => index)
    .sort((left, right) => direction * (amounts[right] * 100 - cents[right] - (amounts[left] * 100 - cents[left])));
  while (remaining !== 0) {
    const contributors = order.filter((index) => amounts[index] * direction > 0 || cents[index] * direction < 0);
    if (!contributors.length) break;
    const share = Math.ceil(Math.abs(remaining) / contributors.length);
    for (const index of contributors) {
      const limit = amounts[index] * direction > 0 ? Math.abs(remaining) : Math.abs(cents[index]);
      const correction = Math.min(Math.abs(remaining), share, limit);
      cents[index] += direction * correction;
      remaining -= direction * correction;
    }
  }
  return cents.map((value) => value / 100);
}
