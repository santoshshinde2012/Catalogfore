import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseProductCatalog } from "../packages/catalog/src/index.ts";
import { fetchRss, newBillingPosts } from "./catalog-watch.mjs";
import { fetchAllowed } from "./https-allowlist.mjs";
import { validateCatalog } from "./validate-catalog.mjs";
import {
  newSitemapProducts,
  nextCatalogVersion,
  rateChangeFlags,
  renderResearchIssue,
  renderWeeklySummary,
  researchItems,
  robotsAllows,
  sitemapLocs,
  skuRateFlags,
} from "./weekly-diff.mjs";

const root = new URL("../", import.meta.url);
const apply = process.argv.includes("--apply");
const offline = process.argv.includes("--offline");
const today = new Date().toISOString().slice(0, 10);
const catalogPath = new URL("data/product-catalog.json", root);
const statePath = new URL("data/catalog-watch-state.json", root);

const before = snapshot();
const stateBefore = readJson(statePath);
const catalog = readCatalog();
const priceErrors = priceFileErrors();
if (priceErrors.length) fail(priceErrors.join("\n"));

const notes = await metadataNotes(stateBefore);
if (apply) {
  run("scripts/refresh-prices.mjs");
  run("scripts/catalog-watch.mjs");
  readCatalog();
  const afterErrors = priceFileErrors();
  if (afterErrors.length) fail(afterErrors.join("\n"));
}

const after = snapshot();
const vm = rateChangeFlags(
  before.prices.prices,
  after.prices.prices,
  (row) => `${row.cloud}:${row.region}:${row.instanceId}`,
  (row) => row.onDemandHourly,
);
const meters = rateChangeFlags(
  before.meters.meters,
  after.meters.meters,
  (row) => `${row.region}:${row.sku}`,
  (row) => row.usdPerDbu,
);
const sku = skuRateFlags(before.sku, after.sku);
const flags = [...vm.flags, ...meters.flags, ...sku.flags];
const added = [...vm.added, ...meters.added, ...sku.added];
const removed = [...vm.removed, ...meters.removed, ...sku.removed];
const stateAfter = readJson(statePath);
const checklist = researchItems({ notes, beforeState: stateBefore, afterState: stateAfter });
const changed = dirty() || added.length + removed.length > 0 || checklist.length > 0;
let catalogVersion = catalog.version;
if (apply && changed) {
  catalogVersion = nextCatalogVersion(catalog.version, today);
  const next = { ...catalog, version: catalogVersion, verifiedOn: today };
  parseProductCatalog(next);
  writeFileSync(catalogPath, `${JSON.stringify(next, null, 2)}\n`);
  noteChangelog(catalog.version, catalogVersion);
  writeFileSync(new URL("data/weekly-summary.md", root), summary(catalogVersion, false));
}
const issue = renderResearchIssue(checklist);
if (apply && issue) writeFileSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "cayfore-research-issue.md"), `${issue}\n`);
console.log(summary(catalogVersion, !apply));
if (issue) console.log(`\n${issue}`);

function readCatalog() {
  try {
    return parseProductCatalog(readJson(catalogPath));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "catalog schema failed");
  }
}

function readJson(path: URL) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function snapshot() {
  return {
    prices: readJson(new URL("data/cloud-vm-prices.json", root)),
    meters: readJson(new URL("data/azure-dbu-meters.json", root)),
    sku: readJson(new URL("data/sku-rates.json", root)),
  };
}

function priceFileErrors() {
  return validateCatalog({
    sku: readJson(new URL("data/sku-rates.json", root)),
    instances: readJson(new URL("data/instances.json", root)),
    prices: readJson(new URL("data/cloud-vm-prices.json", root)),
    azureMeters: readJson(new URL("data/azure-dbu-meters.json", root)),
  });
}

async function metadataNotes(state: { rssGuids?: string[]; sitemapLocs?: string[] }) {
  if (offline) return ["Offline. RSS, robots, and sitemap checks were skipped."];
  try {
    const collected = [];
    const items = await fetchRss();
    for (const post of newBillingPosts(items, state.rssGuids ?? [])) collected.push(`New release note: ${post.title}`);
    collected.push(...(await siteNotes("https://www.databricks.com", state.sitemapLocs ?? [])));
    collected.push(...(await siteNotes("https://docs.databricks.com", state.sitemapLocs ?? [])));
    return collected;
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : "";
    const message = `${error instanceof Error ? error.message : "metadata check failed"}${cause}`;
    if (apply) fail(message);
    return [`Metadata check failed: ${message}. Dry run continued.`];
  }
}

async function siteNotes(origin: string, seen: string[]) {
  const robotsUrl = `${origin}/robots.txt`;
  const robots = await fetchAllowed(robotsUrl, "cayfore-weekly-catalog");
  if (!robots.ok) throw new Error(`${robotsUrl} returned ${robots.status}`);
  const text = await robots.text();
  const allowed = robotsAllows(text, "/sitemap.xml");
  const notes = [
    allowed ? `${robotsUrl} allows /sitemap.xml.` : `${robotsUrl} disallows /sitemap.xml. The sitemap was not fetched.`,
  ];
  if (!allowed) return notes;
  const fresh = newSitemapProducts(await readSitemap(origin, text), seen);
  for (const loc of fresh) notes.push(`New sitemap product: ${loc}`);
  if (apply && fresh.length) rememberLocs(fresh);
  return notes;
}

async function readSitemap(origin: string, robotsText: string) {
  const pages: string[] = [];
  const queue = [`${origin}/sitemap.xml`];
  const seen = new Set<string>();
  for (let fetches = 0; fetches < 8 && queue.length; fetches += 1) {
    const next = queue.shift();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    if (!robotsAllows(robotsText, new URL(next).pathname)) continue;
    const response = await fetchAllowed(next, "cayfore-weekly-catalog");
    if (!response.ok) throw new Error(`${next} returned ${response.status}`);
    const locs = sitemapLocs(await response.text());
    pages.push(...locs.filter((loc) => !loc.endsWith(".xml")));
    const nested = locs
      .filter((loc) => loc.startsWith(`${origin}/`) && loc.endsWith(".xml") && !seen.has(loc))
      .sort((left, right) => sitemapRank(right) - sitemapRank(left));
    queue.unshift(...nested);
  }
  return pages;
}

function sitemapRank(loc: string) {
  if (/website/i.test(loc)) return 2;
  if (/product/i.test(loc)) return 1;
  return 0;
}

function rememberLocs(fresh: string[]) {
  const state = readJson(statePath);
  const sitemapLocsSeen = [...new Set([...(state.sitemapLocs ?? []), ...fresh])];
  writeFileSync(statePath, `${JSON.stringify({ ...state, sitemapLocs: sitemapLocsSeen }, null, 2)}\n`);
}

function summary(catalogVersion: string, dryRun: boolean) {
  return renderWeeklySummary({ today, catalogVersion, dryRun, added, removed, flags, notes });
}

function noteChangelog(from: string, to: string) {
  const path = new URL("CHANGELOG.md", root);
  const current = readFileSync(path, "utf8");
  const bullet = `- Weekly catalog check on ${today}. Catalog version ${from} -> ${to}.\n`;
  if (current.includes(bullet.trim())) return;
  const marker = "### Changed\n\n";
  if (!current.includes(marker)) fail("CHANGELOG.md is missing the Unreleased Changed section");
  writeFileSync(path, current.replace(marker, marker + bullet));
}

function dirty() {
  if (!apply) return false;
  const status = spawnSync("git", ["status", "--porcelain", "--", "data", "docs/COVERAGE.md"], { encoding: "utf8" });
  return Boolean(status.stdout?.trim());
}

function run(script: string) {
  const child = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (child.status !== 0) process.exit(child.status ?? 1);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
