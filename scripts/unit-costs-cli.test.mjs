import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function run(...args) {
  return spawnSync(process.execPath, ["node_modules/vite-node/vite-node.mjs", "scripts/cayfore.ts", "rates", ...args], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

test("rates CLI exports regional source prices and operational conversion factors without portfolio discounts", () => {
  const result = run("--product", "jobs_classic", "--cloud", "azure", "--region", "eastus", "--tier", "premium");
  assert.equal(result.status, 0, result.stderr);
  const book = JSON.parse(result.stdout);
  assert.deepEqual(
    book.products.map((product) => product.id),
    ["jobs_classic"],
  );
  assert.ok(book.rows.length > 1);
  assert.ok(book.rows.every((row) => row.cloud === "azure" || row.cloud === null));
  assert.ok(book.rows.every((row) => row.region === "eastus" || row.region === null));
  assert.ok(book.rows.every((row) => row.tier === "premium" || row.tier === null));
  const compute = book.rows.find((row) => row.baseRateUsd === 0.3 && row.dbuPerUnit > 0);
  assert.ok(compute, "the East US measured $0.30/DBU basis must be visible");
  assert.ok(Math.abs(compute.usdPerUnit - compute.dbuPerUnit * 0.3) < 1e-10);
  assert.ok(compute.sources.some((source) => source.role === "price" && source.url.startsWith("https://")));
  assert.ok(compute.sources.some((source) => source.role === "consumption"));
});

test("rates CSV is a source-price export and missing Lakebase coverage remains unresolved", () => {
  const flags = ["--product", "lakebase", "--cloud", "gcp", "--region", "us-central1", "--tier", "premium"];
  const json = run(...flags);
  assert.equal(json.status, 0, json.stderr);
  const book = JSON.parse(json.stdout);
  assert.ok(book.rows.length > 0);
  assert.ok(book.rows.every((row) => row.unitPriceUsd === null && row.usdPerUnit === null));
  const csv = run("--format", "csv", ...flags);
  assert.equal(csv.status, 0, csv.stderr);
  assert.match(csv.stdout.split("\r\n")[0], /unitPriceUsd,usdPerUnit/);
  assert.match(csv.stdout, /unpriced/);
  assert.match(csv.stdout, /https:/);
  assert.doesNotMatch(csv.stdout, /undefined|NaN/);
});

test("rates CLI rejects dimensions that could silently select the wrong source price", () => {
  for (const flags of [
    ["--cloud", "other"],
    ["--cloud", "aws", "--region", "eastus"],
    ["--tier", "standard"],
    ["--product", "missing"],
    ["--domain", "missing"],
    ["--component", "missing"],
    ["--status", "free"],
    ["--evidence", "trustworthy"],
    ["--format", "xlsx"],
    ["--cloud"],
    ["--cloud", "aws", "--cloud", "azure"],
    ["--xlsx", "unrelated.xlsx"],
  ]) {
    const result = run(...flags);
    assert.equal(result.status, 1, flags.join(" "));
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0);
  }
});

test("rates CLI can export direct first-party prices without mixing in derived or planning rows", () => {
  const result = run(
    "--product",
    "jobs_serverless",
    "--cloud",
    "azure",
    "--region",
    "eastus",
    "--tier",
    "premium",
    "--evidence",
    "official",
  );
  assert.equal(result.status, 0, result.stderr);
  const book = JSON.parse(result.stdout);
  assert.ok(book.rows.length > 0);
  assert.ok(book.rows.every((row) => row.evidenceLevel === "official" && row.unitPriceUsd !== null));
  assert.ok(
    book.rows.every((row) =>
      row.sources.some((source) => source.authority === "first_party" && source.role === "price"),
    ),
  );
});
