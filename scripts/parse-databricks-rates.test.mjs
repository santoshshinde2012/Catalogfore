import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { DATABRICKS_SOURCES } from "./databricks-rate-mapping.mjs";
import { parseDatabricksRates } from "./parse-databricks-rates.mjs";
import { parseDatabricksCards } from "./parse-databricks-cards.mjs";
import { assertCoverageRetained, fetchCalculator, snapshot } from "./refresh-databricks-rates.mjs";
import { validateDatabricksSnapshot } from "./validate-databricks-rates.mjs";

const observedOn = "2026-10-17";
const aws = DATABRICKS_SOURCES[0];
const gcp = DATABRICKS_SOURCES[1];
const cards = DATABRICKS_SOURCES[2];
const row = (overrides = {}) => ({
  cloud: "AWS",
  compute: "Jobs Compute",
  plan: "Premium",
  baserate: "0.15",
  compute_label: "Jobs Compute ($0.15/DBU)",
  region: null,
  ...overrides,
});
const parse = (rows, source = aws) => parseDatabricksRates(JSON.stringify(rows), source, observedOn);
const cardsFixture = () => ({
  premium: {
    AWS: { "jobs_compute_/_jobs_compute_photon": { "US East (N. Virginia)": "0.15" } },
    GCP: { "jobs_compute_/_jobs_compute_photon": { "US (Iowa)": "0.15" } },
  },
  enterprise: {
    AWS: { "jobs_compute_/_jobs_compute_photon": { "US East (N. Virginia)": "0.20" } },
    GCP: { "jobs_compute_/_jobs_compute_photon": { "US (Iowa)": "0.20" } },
  },
});
const parseCards = (input = cardsFixture()) => parseDatabricksCards(JSON.stringify(input), cards, observedOn);
const fixture = () => snapshot([parse([row()]), parse([row({ cloud: "GCP" })], gcp), parseCards()], observedOn);

test("normalizes first-party DBU prices without mistaking absent regional scope for a regional tariff", () => {
  const text = JSON.stringify([
    row(),
    row({ baserate: "0.150" }),
    row({ compute: "Lakebase", baserate: "0.40", dburate: "0.230", hourrate: "0.092" }),
    row({ compute: "FM API Serving - Provisioned Throughput", baserate: "12.00" }),
    row({ compute: "Jobs Compute - SAP" }),
  ]);
  const result = parseDatabricksRates(text, aws, observedOn);
  assert.equal(result.rates.length, 1);
  assert.equal(result.rates[0].region, null);
  assert.equal(result.rates[0].usdPerUnit, 0.15);
  assert.equal(result.rates[0].unit, "DBU");
  assert.equal(result.rates[0].sourceRowIndex, 0);
  assert.equal(result.rates[0].matchedRows, 2);
  assert.equal(result.rates[0].effectiveFrom, null);
  assert.equal(result.source.sha256, createHash("sha256").update(text).digest("hex"));
  assert.equal(result.source.observedOn, observedOn);
  assert.equal(result.exclusions.length, 3);
});

test("accepts exact region labels and corroborated SQL DBU price, quarantines inconsistent hourly examples", () => {
  const result = parse([
    row(),
    row({
      compute: "SQL Pro Compute",
      compute_label: "SQL Pro Compute",
      baserate: "0.55",
      dburate: "4",
      hourrate: "2.20",
      region: "US West (California)",
    }),
    row({
      compute: "SQL Pro Compute",
      compute_label: "SQL Pro Compute",
      baserate: "0.55",
      dburate: "4",
      hourrate: "0.1",
      region: "US West (California)",
    }),
  ]);
  const sql = result.rates.find((rate) => rate.sku === "sql_pro");
  assert.equal(sql.region, "us-west-1");
  assert.equal(sql.usdPerUnit, 0.55);
  assert.equal(sql.sourceRegion, "US West (California)");
  assert.equal(sql.matchedRows, 1);
  assert.equal(result.issues[0].reason, "invalid-or-uncorroborated-USD-per-DBU-value");
});

test("rejects ambiguous prices rather than selecting a lowest duplicate", () => {
  const result = parse([
    row(),
    row({ baserate: "0.20", compute_label: "Jobs Compute ($0.20/DBU)" }),
    row({ compute: "All-Purpose Compute", baserate: "0.55", compute_label: "All-Purpose Compute ($0.55/DBU)" }),
  ]);
  assert.equal(
    result.rates.some((rate) => rate.sku === "jobs_classic"),
    false,
  );
  assert.deepEqual(result.issues[0].sourceValues, [0.15, 0.2]);
  assert.equal(result.issues[0].reason, "conflicting-calculator-values");
});

test("quarantines known unresolved GCP Enterprise Virginia automated-compute outlier", () => {
  const result = parse(
    [
      row({ cloud: "GCP" }),
      row({
        cloud: "GCP",
        compute: "Jobs Serverless Compute",
        compute_label: "Jobs Serverless Compute ($0.95/DBU)",
        baserate: "0.95",
        plan: "Enterprise",
        region: "US (Virginia)",
      }),
      row({
        cloud: "GCP",
        compute: "DLT Serverless Compute",
        compute_label: "DLT Serverless Compute ($0.45/DBU)",
        baserate: "0.45",
        plan: "Enterprise",
        region: "US (Virginia)",
      }),
    ],
    gcp,
  );
  assert.equal(
    result.rates.some((rate) => rate.sku === "jobs_serverless"),
    false,
  );
  assert.equal(result.issues[0].reason, "unreconciled-calculator-outlier-vs-paired-automated-SKU");
  assert.deepEqual(result.issues[0].sourceValues, [0.95, 0.45]);
});

test("quarantines invalid units, unknown regions and wrong clouds, and rejects entirely unusable captures", () => {
  const result = parse([
    row(),
    row({ baserate: "0" }),
    row({ region: "Made up region" }),
    row({ cloud: "Azure" }),
    row({ baserate: "0.2USD" }),
    row({ plan: "Standard" }),
  ]);
  assert.equal(result.rates.length, 1);
  assert.equal(result.issues.length, 5);
  assert.throws(() => parse([]), /nonempty calculator array/);
  assert.throws(() => parse([row({ baserate: "0" })]), /no eligible/);
});

test("offline validation detects monetary, dimension, locator, date, source and duplicate tampering", () => {
  assert.deepEqual(validateDatabricksSnapshot(fixture()), []);
  for (const change of [
    (value) => {
      value.rates[0].currency = "EUR";
    },
    (value) => {
      value.rates[0].usdPerUnit = NaN;
    },
    (value) => {
      value.rates[0].unit = "hour";
    },
    (value) => {
      value.rates[0].region = "made-up";
    },
    (value) => {
      value.rates[0].sku = "made_up_sku";
    },
    (value) => {
      value.rates[0].sourceRowIndex = 100;
    },
    (value) => {
      value.rates[0].observedOn = "2026-10-18";
    },
    (value) => {
      value.rates[0].effectiveFrom = observedOn;
    },
    (value) => {
      value.sources[0].url += "?untrusted=1";
    },
    (value) => {
      value.sources[0].capturePath = "../../anything.json.gz";
    },
    (value) => {
      value.sources[0].sha256 = "not-a-hash";
    },
    (value) => {
      value.observedOn = "2026-02-30";
    },
    (value) => {
      value.rates.push({ ...value.rates[0] });
    },
  ]) {
    const value = fixture();
    change(value);
    assert.ok(validateDatabricksSnapshot(value).length > 0);
  }
});

test("price cards preserve exact regional JSON pointers and exclude composite units, SAP and unavailable placeholders", () => {
  const input = cardsFixture();
  input.premium.AWS.compute_for_apps = { "US East (N. Virginia)": "0.75" };
  input.premium.AWS.vector_search_standard = { "US East (N. Virginia)": "0.28|0.230" };
  input.premium.AWS.database_serverless_compute = { "US East (N. Virginia)": "0.40" };
  input.premium.AWS.sql_serverless = { "US East (N. Virginia)": "X" };
  input.premium.AWS.jobs_serverless = { "GovCloud (US West)": "0.57" };
  const result = parseCards(input);
  assert.equal(result.rates.length, 5);
  const app = result.rates.find((rate) => rate.sku === "apps");
  assert.equal(app.usdPerUnit, 0.75);
  assert.equal(app.sourcePointer, "/premium/AWS/compute_for_apps/US East (N. Virginia)");
  assert.ok(
    result.rates.find(
      (rate) => rate.sourcePointer === "/premium/AWS/jobs_compute_~1_jobs_compute_photon/US East (N. Virginia)",
    ),
  );
  assert.equal(result.issues[0].reason, "invalid-or-unavailable-DBU-price-card");
  assert.equal(result.exclusions.length, 2);
});

test("same-key official source disagreements are removed and expose both conflicting source prices", () => {
  const first = parse([
    row({
      compute: "Jobs Serverless Compute",
      compute_label: "Jobs Serverless Compute ($0.35/DBU)",
      baserate: "0.35",
      region: "US East (N. Virginia)",
    }),
  ]);
  const input = cardsFixture();
  input.premium.AWS.jobs_serverless = { "US East (N. Virginia)": "0.40" };
  const result = snapshot([first, parse([row({ cloud: "GCP" })], gcp), parseCards(input)], observedOn);
  assert.equal(
    result.rates.some(
      (rate) =>
        rate.cloud === "aws" &&
        rate.region === "us-east-1" &&
        rate.tier === "premium" &&
        rate.sku === "jobs_serverless",
    ),
    false,
  );
  const issue = result.issues.find((item) => item.status === "conflict");
  assert.equal(issue.reason, "conflicting-first-party-USD-per-DBU-values");
  assert.deepEqual(issue.sourceIds, [cards.id, aws.id]);
  assert.deepEqual(
    issue.sources.map((item) => item.usdPerUnit),
    [0.4, 0.35],
  );
  assert.equal(issue.sources[0].sourcePointer, "/premium/AWS/jobs_serverless/US East (N. Virginia)");
  assert.deepEqual(validateDatabricksSnapshot(result), []);
});

test("same-price corroboration selects direct product card and detects altered JSON pointer", () => {
  const first = parse([row({ region: "US East (N. Virginia)" })]);
  const result = snapshot([first, parse([row({ cloud: "GCP" })], gcp), parseCards()], observedOn);
  const rate = result.rates.find(
    (item) => item.cloud === "aws" && item.region === "us-east-1" && item.tier === "premium",
  );
  assert.equal(rate.sourceId, cards.id);
  assert.deepEqual(validateDatabricksSnapshot(result), []);
  rate.sourcePointer = "/premium/AWS/another-product/US East (N. Virginia)";
  assert.ok(validateDatabricksSnapshot(result).some((error) => error.includes("JSON pointer")));
});

test("fetcher uses exact allowlisted HTTPS URLs and rejects redirects or alternate endpoint paths", async () => {
  let called = false;
  const fetched = await fetchCalculator(aws, async (url, options) => {
    called = true;
    assert.equal(url.toString(), aws.url);
    assert.equal(options.redirect, "error");
    return { ok: true, text: async () => "[]" };
  });
  assert.equal(fetched, "[]");
  assert.equal(called, true);
  for (const url of [
    aws.url.replace("https:", "http:"),
    aws.url + "?variant=other",
    "https://www.databricks.com.evil.test/AWS.json",
  ])
    await assert.rejects(() => fetchCalculator({ ...aws, url }), /not allowlisted/);
  await assert.rejects(() => fetchCalculator(aws, async () => ({ ok: false, status: 403 })), /HTTP 403/);
});

test("coverage guard detects one cloud's price loss even when another cloud's growth hides it", () => {
  const counts = (awsCount, gcpCount) => ({
    rates: [
      ...Array.from({ length: awsCount }, () => ({ cloud: "aws" })),
      ...Array.from({ length: gcpCount }, () => ({ cloud: "gcp" })),
    ],
  });
  const previous = counts(100, 100);
  assert.throws(() => assertCoverageRetained(previous, counts(150, 79)), /coverage for gcp.*100 to 79/);
  assert.throws(() => assertCoverageRetained(previous, counts(79, 150)), /coverage for aws.*100 to 79/);
  assert.throws(() => assertCoverageRetained(previous, counts(70, 70)), /coverage for all clouds/);
  assert.doesNotThrow(() => assertCoverageRetained(previous, counts(80, 80)));
  assert.doesNotThrow(() => assertCoverageRetained(null, counts(1, 1)));
  assert.doesNotThrow(() => assertCoverageRetained(counts(100, 0), counts(100, 1)));
});
