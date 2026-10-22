import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const directory = mkdtempSync(join(tmpdir(), "cayfore-cli-"));
after(() => rmSync(directory, { recursive: true, force: true }));
function run(...args) {
  return spawnSync(process.execPath, ["node_modules/vite-node/vite-node.mjs", "scripts/cayfore.ts", ...args], {
    encoding: "utf8",
  });
}
function fixture(name, body) {
  const path = join(directory, name);
  writeFileSync(path, body);
  return path;
}

test("usage CLI preserves exported costs, last complete month, and cloud without synthetic VMs", () => {
  const path = fixture(
    "usage.csv",
    [
      "usage_date,sku_name,usage_quantity,usage_unit,list_price,cloud",
      "2026-01-31,JOBS_COMPUTE,100,DBU,0.1,AZURE",
      "2026-02-28,JOBS_COMPUTE,100,DBU,0.1,AZURE",
      "2026-03-16,JOBS_COMPUTE,50,DBU,0.1,AZURE",
    ].join("\n"),
  );
  const result = run("usage", path, "--cloud", "aws", "--tier", "enterprise", "--as-of", "2026-03-17");
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.selectedMonth, "2026-02");
  assert.equal(body.estimate.total, 10);
  assert.equal(body.estimate.cloudCost, 0);
  assert.equal(body.portfolio.cloud, "azure");
  assert.equal(body.portfolio.tier, "enterprise");
  assert.equal(body.sourceCoverage.pricedRows, 1);
  assert.deepEqual(
    body.months.map((month) => month.expected),
    body.forecast.map((point) => point.total),
  );
  assert.ok(Math.abs(body.forecast.slice(0, 12).reduce((sum, point) => sum + point.total, 0) - body.annual) < 0.005);
  const saved = fixture(
    "saved.json",
    JSON.stringify({ format: "cayfore.forecast", version: 1, portfolio: body.portfolio }),
  );
  const reopened = run("forecast", saved);
  assert.equal(reopened.status, 0, reopened.stderr);
  assert.equal(JSON.parse(reopened.stdout).annual, body.annual);
});

test("CLI rejects unrelated saved JSON and invalid usage options", () => {
  const invalid = fixture("invalid.json", "{}");
  assert.equal(run("forecast", invalid).status, 1);
  const usage = fixture("empty.csv", "sku_name,usage_quantity,usage_unit\nJOBS_COMPUTE,100,DBU");
  assert.equal(run("usage", usage, "--cloud", "unknown").status, 1);
  assert.equal(run("usage", usage, "--month", "2026-13").status, 1);
});

test("forecast CLI accepts exported reports above the share limit and enforces the file limit", () => {
  const saved = {
    format: "cayfore.forecast",
    version: 1,
    portfolio: {
      version: 1,
      name: "Saved report",
      cloud: "aws",
      region: "us-east-1",
      tier: "premium",
      workloads: [],
      commitment: { dbuDiscount: 0, cloudDiscount: 0 },
      addon: "none",
      usageScale: 1,
      forecast: { months: 12, annualGrowth: 0, seasonality: "flat" },
    },
    report: "x".repeat(1_000_001),
  };
  const result = run("forecast", fixture("large-report.json", JSON.stringify(saved)));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).portfolio.name, "Saved report");

  saved.report = "x".repeat(8_000_001);
  const oversized = run("forecast", fixture("oversized-report.json", JSON.stringify(saved)));
  assert.equal(oversized.status, 1);
  assert.match(oversized.stderr, /too large/i);
});

test("estimate --xlsx writes a workbook and keeps the JSON summary", () => {
  const path = join(directory, "forecast.xlsx");
  const result = run("estimate", "--xlsx", path);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).annual, 170257.52);
  assert.match(JSON.parse(result.stdout).pricesLine, /^Prices updated \d{4}-\d{2}-\d{2}\.$/);
  assert.equal(existsSync(path), true);
  assert.equal(run("estimate", "--xlsx").status, 1);
});

test("SQL helper remains available without a usage file", () => {
  const result = run("sql");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /system\.billing\.usage/);
});
