import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATABRICKS_SOURCES } from "./databricks-rate-mapping.mjs";
import { parseDatabricksRates } from "./parse-databricks-rates.mjs";
import { parseDatabricksCards } from "./parse-databricks-cards.mjs";
import { capturePath, validateDatabricksSnapshot } from "./validate-databricks-rates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function fetchCalculator(source, fetcher = fetch) {
  if (!DATABRICKS_SOURCES.some((allowed) => allowed.id === source.id && allowed.url === source.url))
    throw new Error("Calculator endpoint is not allowlisted");
  const url = new URL(source.url);
  if (url.protocol !== "https:" || url.hostname !== "www.databricks.com" || url.username || url.password)
    throw new Error("Unexpected calculator origin");
  const response = await fetcher(url, {
    headers: { "user-agent": "cayfore-price-refresh" },
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
  return response.text();
}

export function snapshot(results, observedOn) {
  const key = (row) => [row.cloud, row.region ?? "_", row.tier, row.sku].join(":");
  const rates = new Map();
  const issues = results.flatMap((result) => result.issues);
  const blocked = new Set();
  const conflict = (rate, previous, priorIssue) => {
    const identity = key(rate);
    blocked.add(identity);
    rates.delete(identity);
    issues.push({
      id: `official-conflict:${identity}`,
      cloud: rate.cloud,
      region: rate.region,
      tier: rate.tier,
      sku: rate.sku,
      reason: "conflicting-first-party-USD-per-DBU-values",
      status: "conflict",
      sourceId: rate.sourceId,
      sourceIds: [rate.sourceId, previous?.sourceId ?? priorIssue.sourceId],
      sourceRowIndexes: [rate.sourceRowIndex],
      sourceValues: [rate.usdPerUnit, previous?.usdPerUnit ?? priorIssue.sourceValues[0]],
      sources: [
        {
          sourceId: rate.sourceId,
          usdPerUnit: rate.usdPerUnit,
          sourceRowIndex: rate.sourceRowIndex,
          ...(rate.sourcePointer ? { sourcePointer: rate.sourcePointer } : {}),
        },
        {
          sourceId: previous?.sourceId ?? priorIssue.sourceId,
          usdPerUnit: previous?.usdPerUnit ?? priorIssue.sourceValues[0],
          sourceRowIndex: previous?.sourceRowIndex ?? priorIssue.sourceRowIndexes[0],
        },
      ],
    });
  };
  for (const rate of results.flatMap((result) => result.rates)) {
    const identity = key(rate);
    if (blocked.has(identity)) continue;
    const priorIssue = issues.find(
      (issue) =>
        key(issue) === identity &&
        ["unreconciled-calculator-outlier-vs-paired-automated-SKU", "conflicting-calculator-values"].includes(
          issue.reason,
        ) &&
        issue.sourceValues?.some((value) => value !== rate.usdPerUnit),
    );
    const previous = rates.get(identity);
    if ((previous && Math.abs(previous.usdPerUnit - rate.usdPerUnit) > 1e-9) || priorIssue) {
      conflict(rate, previous, priorIssue);
      continue;
    }
    // Same-price direct product card supplies the clearest exact region locator.
    if (!previous || rate.sourceId === "databricks-price-cards") rates.set(identity, rate);
  }
  return {
    schemaVersion: 1,
    observedOn,
    scope:
      "First-party Databricks product price cards and corroborating calculator USD/DBU snapshot for explicitly mapped AWS/GCP SKUs. Null region means the calculator omitted regional scope: use as a reference base only. Presence of a published price does not establish service availability. Excludes negotiated terms, SAP, government, Photon consumption, Lakebase capacity units, AI Search compound endpoint/storage units, and model-specific units. Same-key primary dollar-rate disagreements are quarantined. Source hashes identify exact downloaded bytes; observation dates do not establish a tariff effective date.",
    sources: results.map((result) => ({ ...result.source, capturePath: capturePath(result.source.id) })),
    rates: [...rates.values()].sort((a, b) => key(a).localeCompare(key(b))),
    issues,
    exclusions: results.flatMap((result) => result.exclusions),
  };
}

const parseSource = (text, source, observedOn) =>
  source.id === "databricks-price-cards"
    ? parseDatabricksCards(text, source, observedOn)
    : parseDatabricksRates(text, source, observedOn);

export function assertCoverageRetained(previous, next) {
  if (!previous) return;
  const scopes = [
    ["all clouds", previous.rates.length, next.rates.length],
    ...["aws", "gcp"].map((cloud) => [
      cloud,
      previous.rates.filter((rate) => rate.cloud === cloud).length,
      next.rates.filter((rate) => rate.cloud === cloud).length,
    ]),
  ];
  for (const [scope, before, after] of scopes)
    if (before > 0 && after < before * 0.8)
      throw new Error(
        `Official rate coverage for ${scope} fell by more than 20% (${before} to ${after}); review before replacing the snapshot`,
      );
}

async function main() {
  if (process.argv.slice(2).some((value) => value !== "--check") || process.argv.slice(2).length > 1)
    throw new Error("Usage: node scripts/refresh-databricks-rates.mjs [--check]");
  const filename = path.join(root, "data/databricks-dbu-rates.json");
  if (process.argv.includes("--check")) {
    const stored = JSON.parse(await readFile(filename, "utf8"));
    const errors = validateDatabricksSnapshot(stored);
    if (errors.length) throw new Error(errors.join("\n"));
    const replay = await Promise.all(
      DATABRICKS_SOURCES.map(async (source) => {
        const metadata = stored.sources.find((item) => item.id === source.id);
        const text = gunzipSync(await readFile(path.join(root, capturePath(source.id)))).toString("utf8");
        return parseSource(text, source, metadata.observedOn);
      }),
    );
    if (JSON.stringify(snapshot(replay, stored.observedOn)) !== JSON.stringify(stored))
      throw new Error(
        "Official snapshot differs from retained first-party response captures; rerun refresh-databricks-rates",
      );
    console.log(
      `Official rate snapshot verified against ${stored.sources.length} captured sources: ${stored.rates.length} rates.`,
    );
    return;
  }
  const observedOn = new Date().toISOString().slice(0, 10);
  const downloads = await Promise.all(
    DATABRICKS_SOURCES.map(async (source) => {
      const text = await fetchCalculator(source);
      return { text, result: parseSource(text, source, observedOn) };
    }),
  );
  const next = snapshot(
    downloads.map((download) => download.result),
    observedOn,
  );
  const errors = validateDatabricksSnapshot(next);
  if (errors.length) throw new Error(errors.join("\n"));
  const previous = await readFile(filename, "utf8")
    .then(JSON.parse)
    .catch(() => null);
  assertCoverageRetained(previous, next);
  await mkdir(path.join(root, "data/sources"), { recursive: true });
  for (const download of downloads)
    await writeFile(path.join(root, capturePath(download.result.source.id)), gzipSync(download.text, { level: 9 }));
  await writeFile(filename, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    `Databricks official snapshot: ${next.rates.length} USD/DBU rates, ${next.issues.length} quarantined issues; ${next.sources.map((source) => source.cloud).join(", ")}.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
