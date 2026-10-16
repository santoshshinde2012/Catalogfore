import { productCatalog, type Product } from "@cayfore/catalog";
import { annualTotal, forecast } from "./forecast.js";
import { roundMoney } from "./money.js";
import type { Estimate, Portfolio, Workload } from "./types.js";
import { createWorkload, type MenuKind } from "./workload-seeds.js";

export function listProducts(): readonly Product[] {
  return productCatalog.products;
}

export function productCatalogMeta(): { version: string; verifiedOn: string; disclaimer: string } {
  return {
    version: productCatalog.version,
    verifiedOn: productCatalog.verifiedOn,
    disclaimer: productCatalog.disclaimer,
  };
}

export function productCategories(): { id: Product["category"]; label: string }[] {
  return productCatalog.categories;
}

export function productById(id: string): Product | undefined {
  return productCatalog.products.find((product) => product.id === id);
}

export function workloadForProduct(productId: string): Workload {
  const product = productById(productId);
  if (!product) throw new Error(`Unknown product "${productId}".`);
  const seeded = createWorkload(product.template as MenuKind);
  return {
    ...applyPatch(seeded, product.patch),
    productId: product.id,
    name: product.menuLabel,
  };
}

export interface ProductForecastLine {
  workloadId: string;
  productId: string | null;
  name: string;
  category: string | null;
  monthly: number;
  year: number;
  published: boolean | null;
  billingUnit: string | null;
}

export interface ProductForecast {
  lines: ProductForecastLine[];
  monthly: number;
  year: number;
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
      billingUnit: product?.billingUnit ?? null,
    };
  });
  let spent = 0;
  drafts.forEach((line, index) => {
    if (index === drafts.length - 1) {
      line.monthly = roundMoney(result.total - spent);
    } else {
      spent = roundMoney(spent + line.monthly);
    }
  });
  let yearSpent = 0;
  drafts.forEach((line, index) => {
    if (result.total <= 0) {
      line.year = 0;
      return;
    }
    if (index === drafts.length - 1) {
      line.year = roundMoney(year - yearSpent);
    } else {
      line.year = roundMoney((line.monthly / result.total) * year);
      yearSpent = roundMoney(yearSpent + line.year);
    }
  });
  return { lines: drafts, monthly: result.total, year };
}

function applyPatch(workload: Workload, patch: Product["patch"]): Workload {
  const next: Record<string, unknown> = { ...workload };
  for (const [key, value] of Object.entries(patch)) {
    const current = next[key];
    if (isRecord(value) && isRecord(current)) next[key] = { ...current, ...value };
    else next[key] = value;
  }
  return next as unknown as Workload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
