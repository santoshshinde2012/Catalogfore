import { collectSignals } from "./signal-registry.mjs";
import "./signals/load.mjs";
import { validateCatalog } from "./validate-catalog.mjs";
import {
  nextCatalogVersion,
  rateChangeFlags,
  renderResearchIssue,
  renderWeeklySummary,
  researchItems,
  skuRateFlags,
} from "./weekly-diff.mjs";

const root = new URL("../", import.meta.url);
const catalogPath = new URL("data/product-catalog.json", root);
const statePath = new URL("data/generated/catalog-watch-state.json", root);
const CHANGELOG_MARKER = "### Changed\n\n";

export async function runWeeklyCatalog({ apply, offline, ports }) {
  const today = ports.clock.today();
  const before = snapshot(ports);
  const stateBefore = readJson(ports, statePath);
  const catalog = readCatalog(ports);
  const priceErrors = priceFileErrors(ports);
  if (priceErrors.length) stop(priceErrors.join("\n"));

  const notes = await metadataNotes({ apply, offline, ports, stateBefore });
  if (apply) {
    const official = ports.spawn("scripts/refresh-databricks-rates.mjs");
    if (official !== 0) stop("First-party Databricks source refresh failed", official);
    const refresh = ports.spawn("scripts/refresh-prices.mjs");
    if (refresh !== 0) stop("", refresh);
    const watch = ports.spawn("scripts/catalog-watch.mjs");
    if (watch !== 0) stop("", watch);
    readCatalog(ports);
    const afterErrors = priceFileErrors(ports);
    if (afterErrors.length) stop(afterErrors.join("\n"));
  }

  const after = snapshot(ports);
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
  const published = rateChangeFlags(
    before.published.rates,
    after.published.rates,
    (row) => `official:${row.cloud}:${row.region ?? "reference"}:${row.tier}:${row.sku}`,
    (row) => row.usdPerUnit,
  );
  const flags = [...vm.flags, ...meters.flags, ...sku.flags, ...published.flags];
  const added = [...vm.added, ...meters.added, ...sku.added, ...published.added];
  const removed = [...vm.removed, ...meters.removed, ...sku.removed, ...published.removed];
  notes.push(
    `Databricks calculator snapshot: ${after.published.rates.length} accepted USD/DBU rates; ${after.published.issues.length} quarantined source issues. Observation ${after.published.observedOn}; effective date not published.`,
  );
  const stateAfter = readJson(ports, statePath);
  const checklist = researchItems({ notes, beforeState: stateBefore, afterState: stateAfter });
  const changed = (apply && ports.gitDirty()) || added.length + removed.length > 0 || checklist.length > 0;
  let catalogVersion = catalog.version;
  if (apply && changed) {
    catalogVersion = nextCatalogVersion(catalog.version, today);
    const next = { ...catalog, version: catalogVersion, verifiedOn: today };
    ports.parseCatalog(next);
    ports.writeText(catalogPath, `${JSON.stringify(next, null, 2)}\n`);
    noteChangelog(ports, today, catalog.version, catalogVersion);
    ports.writeText(
      new URL("data/weekly-summary.md", root),
      summary({ today, catalogVersion, added, removed, flags, notes }),
    );
  }
  const issue = renderResearchIssue(checklist);
  if (apply && issue) ports.writeText(ports.researchPath(), `${issue}\n`);
  ports.log(renderWeeklySummary({ today, catalogVersion, dryRun: !apply, added, removed, flags, notes }));
  if (issue) ports.log(`\n${issue}`);
}

async function metadataNotes({ apply, offline, ports, stateBefore }) {
  if (offline) return ["Offline. RSS, robots, and sitemap checks were skipped."];
  try {
    return await collectSignals({
      apply,
      fetch: ports.fetch,
      state: stateBefore,
      rememberSitemapLocs: (fresh) => rememberLocs(ports, fresh),
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : "";
    const message = `${error instanceof Error ? error.message : "metadata check failed"}${cause}`;
    if (apply) stop(message);
    return [`Metadata check failed: ${message}. Dry run continued.`];
  }
}

function rememberLocs(ports, fresh) {
  const state = readJson(ports, statePath);
  const sitemapLocs = [...new Set([...(state.sitemapLocs ?? []), ...fresh])];
  ports.writeText(statePath, `${JSON.stringify({ ...state, sitemapLocs }, null, 2)}\n`);
}

function readCatalog(ports) {
  try {
    return ports.parseCatalog(readJson(ports, catalogPath));
  } catch (error) {
    return stop(error instanceof Error ? error.message : "catalog schema failed");
  }
}

function readJson(ports, path) {
  return JSON.parse(ports.readText(path));
}

function snapshot(ports) {
  return {
    prices: readJson(ports, new URL("data/cloud-vm-prices.json", root)),
    meters: readJson(ports, new URL("data/azure-dbu-meters.json", root)),
    sku: readJson(ports, new URL("data/sku-rates.json", root)),
    published: readJson(ports, new URL("data/databricks-dbu-rates.json", root)),
  };
}

function priceFileErrors(ports) {
  return validateCatalog({
    sku: readJson(ports, new URL("data/sku-rates.json", root)),
    instances: readJson(ports, new URL("data/instances.json", root)),
    prices: readJson(ports, new URL("data/cloud-vm-prices.json", root)),
    azureMeters: readJson(ports, new URL("data/azure-dbu-meters.json", root)),
  });
}

function noteChangelog(ports, today, from, to) {
  const path = new URL("CHANGELOG.md", root);
  const current = ports.readText(path);
  const bullet = `- Weekly catalog check on ${today}. Catalog version ${from} -> ${to}.\n`;
  if (current.includes(bullet.trim())) return;
  if (!current.includes(CHANGELOG_MARKER)) stop("CHANGELOG.md is missing the Unreleased Changed section");
  ports.writeText(path, current.replace(CHANGELOG_MARKER, CHANGELOG_MARKER + bullet));
}

function summary(report) {
  return renderWeeklySummary({ ...report, dryRun: false });
}

function stop(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}
