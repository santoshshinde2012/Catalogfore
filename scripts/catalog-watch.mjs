import { readFile, writeFile } from "node:fs/promises";
import { writeCoverageReport } from "./coverage-report.mjs";

const STATE_PATH = new URL("../data/catalog-watch-state.json", import.meta.url);
const REPORT_PATH = new URL("../data/catalog-watch-report.md", import.meta.url);
const CATALOG_PATH = new URL("../data/product-catalog.json", import.meta.url);
const RSS_URL = "https://www.databricks.com/feed";
const AZURE_PRICES = "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=";
const BILLING_TITLE = /\b(pricing|list price|per dbu|generally available|now available|new sku)\b/i;

export function validateProductCatalogShape(catalog) {
  const errors = [];
  if (!catalog || typeof catalog !== "object") return ["catalog is not an object"];
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(String(catalog.version ?? ""))) errors.push("version");
  if (!Array.isArray(catalog.products) || catalog.products.length < 1) errors.push("products");
  if (!Array.isArray(catalog.knownAzureMeters) || catalog.knownAzureMeters.length < 1) errors.push("knownAzureMeters");
  for (const product of catalog.products ?? []) {
    if (!product.id || !product.listPrice || !product.source?.fetchedOn) errors.push(`product ${product.id ?? "?"}`);
  }
  return errors;
}

/** Manual citations older than `days` are stale. Automated meters are refreshed elsewhere. */
export function staleProductIds(products, today, days = 120) {
  const limit = Date.parse(`${today}T00:00:00Z`) - days * 24 * 60 * 60 * 1000;
  return (products ?? [])
    .filter(
      (product) => product.automation === "manual" && Date.parse(`${product.source?.fetchedOn}T00:00:00Z`) < limit,
    )
    .map((product) => product.id)
    .sort();
}

export function unknownMeterNames(found, known) {
  const listed = new Set(known ?? []);
  return [...new Set(found ?? [])]
    .filter((name) => name && !listed.has(name) && !/photon|free trial|poc /i.test(name))
    .sort();
}

export function newBillingPosts(items, seenGuids) {
  const seen = new Set(seenGuids ?? []);
  return (items ?? []).filter(
    (item) => item?.title && item.guid && BILLING_TITLE.test(item.title) && !seen.has(item.guid),
  );
}

export function parseRssItems(xml) {
  const items = [];
  for (const match of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const body = match[1];
    const title = decodeXml(body.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "").trim();
    const link = decodeXml(body.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
    const guid = decodeXml(body.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? "").trim() || link || title;
    if (title) items.push({ title, link, guid });
  }
  return items;
}

export function renderWatchReport({ version, stale, unknown, posts, liveNote }) {
  const lines = [
    `# Product catalog watch`,
    ``,
    `Catalog \`${version}\`. This report is estimates and public list signals, not a quote.`,
    ``,
    liveNote ? `Live check: ${liveNote}` : `Live check: Azure Retail Prices (East US) and the Databricks RSS feed.`,
    ``,
    `## Stale manual sources`,
    ``,
  ];
  lines.push(
    stale.length ? stale.map((id) => `- \`${id}\``).join("\n") : "None. Manual citations are within 120 days.",
  );
  lines.push("", "## Azure meters not in the catalog", "");
  lines.push(
    unknown.length
      ? unknown.map((name) => `- ${name}`).join("\n")
      : "None in East US beyond the known meter list. Photon, free-trial, and POC meters are ignored.",
  );
  lines.push("", "## Release-note and blog titles that may be billable", "");
  lines.push(
    posts.length
      ? posts.map((post) => `- [${post.title}](${post.link || RSS_URL})`).join("\n")
      : "No new matching titles since the last watch.",
  );
  lines.push("");
  return lines.join("\n");
}

export async function fetchAzureMeterNames(region = "eastus") {
  const names = [];
  let url = AZURE_PRICES + encodeURIComponent(`serviceName eq 'Azure Databricks' and armRegionName eq '${region}'`);
  for (let page = 0; page < 8 && url; page += 1) {
    const response = await fetch(url, { headers: { "user-agent": "cayfore-catalog-watch" } });
    if (!response.ok) throw new Error(String(response.status));
    const body = await response.json();
    for (const item of body.Items ?? []) {
      if (item.priceType && item.priceType !== "Consumption") continue;
      if (!(item.unitPrice > 0)) continue;
      if (item.meterName) names.push(String(item.meterName));
    }
    url = body.NextPageLink || "";
  }
  return names;
}

export async function fetchRss() {
  const response = await fetch(RSS_URL, { headers: { "user-agent": "cayfore-catalog-watch" } });
  if (!response.ok) throw new Error(String(response.status));
  return parseRssItems(await response.text());
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

async function main() {
  const catalog = JSON.parse(await readFile(CATALOG_PATH, "utf8"));
  const errors = validateProductCatalogShape(catalog);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  await writeCoverageReport();
  const state = JSON.parse(await readFile(STATE_PATH, "utf8"));
  const today = new Date().toISOString().slice(0, 10);
  const stale = staleProductIds(catalog.products, today);
  let unknown = state.unknownMeters ?? [];
  let posts = [];
  const notes = [];
  if (!process.argv.includes("--offline")) {
    try {
      unknown = unknownMeterNames(await fetchAzureMeterNamesAll(), catalog.knownAzureMeters);
    } catch {
      notes.push("Azure Retail Prices request failed. The previous meter list was kept.");
      unknown = state.unknownMeters ?? [];
    }
    try {
      posts = newBillingPosts(await fetchRss(), state.rssGuids ?? []);
    } catch {
      notes.push("Databricks RSS request failed.");
    }
  } else {
    notes.push("Offline. Network checks were skipped.");
    unknown = state.unknownMeters ?? [];
  }
  const next = {
    version: 1,
    unknownMeters: unknown,
    rssGuids: [...new Set([...(state.rssGuids ?? []), ...posts.map((post) => post.guid)])].slice(-200),
    staleProductIds: stale,
  };
  const changed =
    JSON.stringify(next.unknownMeters) !== JSON.stringify(state.unknownMeters ?? []) ||
    JSON.stringify(next.staleProductIds) !== JSON.stringify(state.staleProductIds ?? []) ||
    posts.length > 0;
  if (!changed && !process.argv.includes("--offline")) {
    console.log("catalog watch: no catalog changes");
    return;
  }
  const report = renderWatchReport({
    version: catalog.version,
    stale,
    unknown,
    posts,
    liveNote: notes.join(" "),
  });
  await writeFile(STATE_PATH, JSON.stringify(next, null, 2) + "\n");
  await writeFile(REPORT_PATH, report);
  console.log(
    `catalog watch: wrote report (${unknown.length} unknown meters, ${posts.length} posts, ${stale.length} stale)`,
  );
}

async function fetchAzureMeterNamesAll() {
  const sku = JSON.parse(await readFile(new URL("../data/sku-rates.json", import.meta.url), "utf8"));
  const regions = sku.regions.filter((region) => region.cloud === "azure").map((region) => region.id);
  const names = [];
  let cursor = 0;
  async function run() {
    while (cursor < regions.length) {
      const region = regions[cursor];
      cursor += 1;
      names.push(...(await fetchAzureMeterNames(region)));
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, regions.length) }, () => run()));
  return names;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("catalog-watch.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
