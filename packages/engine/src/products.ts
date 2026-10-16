import { productCatalog, type Product } from "@cayfore/catalog";
import { annualTotal, forecast } from "./forecast.js";
import { roundMoney, uid } from "./money.js";
import { METERED_SKUS, type Estimate, type MeteredSku, type Portfolio, type Workload } from "./types.js";
import { importUsageProducts } from "./usage.js";
import { createWorkload, type MenuKind } from "./workload-seeds.js";

const GENIE_FREE_DBU_PER_USER = 150;
const GENIE_WINDOW_END = Date.parse("2027-02-01T00:00:00Z");
const PARSE_DBU_PER_PAGE: Record<string, number> = {
  simple: 12.5,
  caption: 22.5,
  medium: 62.5,
  high: 87.5,
};

/** 0.75 through 2027-01-31, then 1. Genie Code's 25% promo is inside this factor. */
export function geniePromoFactor(now = Date.now()): number {
  return now < GENIE_WINDOW_END ? 0.75 : 1;
}

/** Genie One and Genie Agents user LLM usage is free through 2027-01-31. */
export function genieUserUsageFree(now = Date.now()): boolean {
  return now < GENIE_WINDOW_END;
}

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
  const workloads = workloadsForProduct(productId);
  return workloads[0];
}

/** Every billable part of a product. A product with no parts is a one-element list. */
export function workloadsForProduct(productId: string): Workload[] {
  const product = productById(productId);
  if (!product) throw new Error(`Unknown product "${productId}".`);
  if (product.parts && product.parts.length > 0) {
    return product.parts.map((part) =>
      recomputeProduct({
        ...applyPatch(createWorkload(part.template as MenuKind), part.patch),
        productId: product.id,
        partId: part.id,
        name: part.name,
      }),
    );
  }
  return [
    recomputeProduct({
      ...applyPatch(createWorkload(product.template as MenuKind), product.patch),
      productId: product.id,
      name: product.menuLabel,
    }),
  ];
}

/** Re-apply a catalog formula after an input edit. Products without a formula are unchanged. */
export function recomputeProduct(workload: Workload): Workload {
  const formula = formulaFor(workload);
  if (!formula || workload.kind !== "metered") return workload;
  return applyFormula(workload, formula);
}

export interface UsageProductForecast {
  workloads: Workload[];
  unmapped: string[];
  warnings: string[];
}

/** One workload per mapped product, priced from list_price when the file has it. */
export function workloadsFromUsage(text: string): UsageProductForecast {
  const imported = importUsageProducts(text);
  const warnings = [...imported.warnings];
  const workloads: Workload[] = [];
  for (const row of imported.products) {
    const known = (METERED_SKUS as readonly string[]).includes(row.engineSku);
    const sku = (known ? row.engineSku : "managed_services") as MeteredSku;
    const product = productById(row.productId);
    const name = product?.menuLabel ?? row.productId;
    if (row.dollars != null) {
      const dollars = roundMoney(row.dollars);
      workloads.push({
        id: uid(),
        name: row.unit === "DBU" ? name : `${name} (${row.unit})`,
        productId: row.productId,
        kind: "metered",
        sku,
        dbuPerMonth: 0,
        fixedUsdByCloud: { aws: dollars, azure: dollars, gcp: dollars },
      });
      continue;
    }
    if (row.unit === "DBU") {
      workloads.push({
        id: uid(),
        name,
        productId: row.productId,
        kind: "metered",
        sku,
        dbuPerMonth: row.quantity,
      });
      continue;
    }
    warnings.push(`${name} is in ${row.unit} and the file has no list price, so that row was not priced.`);
  }
  return {
    workloads,
    unmapped: imported.unmapped.map((row) => row.skuName),
    warnings,
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
  listPrice: Product["listPrice"] | null;
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
      listPrice: product?.listPrice ?? null,
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

function formulaFor(workload: Workload): Product["formula"] {
  if (!workload.productId) return undefined;
  const product = productById(workload.productId);
  if (!product) return undefined;
  if (workload.partId) return product.parts?.find((part) => part.id === workload.partId)?.formula;
  return product.formula;
}

function numInput(inputs: Workload["inputs"], key: string): number {
  const value = inputs?.[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function applyFormula(
  workload: Extract<Workload, { kind: "metered" }>,
  formula: NonNullable<Product["formula"]>,
): Workload {
  const inputs = workload.inputs;
  if (formula === "genie_code") {
    const users = numInput(inputs, "users");
    const each = numInput(inputs, "dbuPerUser");
    const billed = Math.max(0, users * each - users * GENIE_FREE_DBU_PER_USER) * geniePromoFactor();
    return { ...workload, sku: "model_serving", dbuPerMonth: billed };
  }
  if (formula === "genie_llm_free") {
    const users = numInput(inputs, "users");
    const each = numInput(inputs, "dbuPerUser");
    const billed = genieUserUsageFree() ? 0 : Math.max(0, users * each - users * GENIE_FREE_DBU_PER_USER);
    return { ...workload, sku: "model_serving", dbuPerMonth: billed };
  }
  if (formula === "genie_sql") {
    const dbu =
      numInput(inputs, "users") * numInput(inputs, "questionsPerUser") * numInput(inputs, "sqlDbuPerQuestion");
    return { ...workload, sku: "sql_serverless", dbuPerMonth: dbu };
  }
  if (formula === "dashboard_sql") {
    const dbu = numInput(inputs, "viewers") * numInput(inputs, "refreshes") * numInput(inputs, "sqlDbuPerRefresh");
    return { ...workload, sku: "sql_serverless", dbuPerMonth: dbu };
  }
  if (formula === "ai_parse") {
    const band = PARSE_DBU_PER_PAGE[String(inputs?.complexity ?? "simple")] ?? PARSE_DBU_PER_PAGE.simple;
    return { ...workload, sku: "model_serving", dbuPerMonth: numInput(inputs, "pages") * band };
  }
  if (formula === "custom_fm") {
    const dbu =
      (numInput(inputs, "inputTokens") / 1_000_000) * numInput(inputs, "inputDbuPerMillion") +
      (numInput(inputs, "outputTokens") / 1_000_000) * numInput(inputs, "outputDbuPerMillion");
    return { ...workload, sku: "model_serving", dbuPerMonth: dbu };
  }
  if (formula === "launch") {
    return { ...workload, sku: "model_serving", dbuPerMonth: numInput(inputs, "launches") };
  }
  const gb = numInput(inputs, "gb");
  return { ...workload, sku: "managed_services", dbuPerMonth: 0, fixedUsdByCloud: { azure: roundMoney(gb * 0.02) } };
}
