import assert from "node:assert/strict";
import test from "node:test";
import {
  newSitemapProducts,
  nextCatalogVersion,
  researchItems,
  sitemapLocs,
  rateChangeFlags,
  renderResearchIssue,
  renderWeeklySummary,
  robotsAllows,
  skuRateFlags,
} from "./weekly-diff.mjs";

test("a rate move over 20 percent is flagged and a smaller move is not", () => {
  const before = [
    { id: "a", hourly: 1 },
    { id: "b", hourly: 1 },
  ];
  const after = [
    { id: "a", hourly: 1.1 },
    { id: "b", hourly: 1.25 },
    { id: "c", hourly: 2 },
  ];
  const diff = rateChangeFlags(
    before,
    after,
    (row) => row.id,
    (row) => row.hourly,
  );
  assert.deepEqual(
    diff.flags.map((flag) => flag.key),
    ["b"],
  );
  assert.deepEqual(diff.added, ["c"]);
  assert.deepEqual(diff.removed, []);
});

test("removed keys and sku cards are reported", () => {
  const diff = skuRateFlags(
    { rates: { aws: { premium: { jobs_classic: 0.15 } } } },
    { rates: { aws: { premium: { jobs_classic: 0.2 } } } },
  );
  assert.equal(diff.flags[0].key, "aws:premium:jobs_classic");
  const gone = rateChangeFlags(
    [{ id: "old", hourly: 1 }],
    [],
    (row) => row.id,
    (row) => row.hourly,
  );
  assert.deepEqual(gone.removed, ["old"]);
});

test("the catalog version bumps on the same day or rolls to a new day", () => {
  assert.equal(nextCatalogVersion("2026-10-16.5", "2026-10-16"), "2026-10-16.6");
  assert.equal(nextCatalogVersion("2026-10-16.5", "2026-10-17"), "2026-10-17.1");
  assert.throws(() => nextCatalogVersion("latest", "2026-10-17"), /dated/);
});

test("robots and sitemap metadata ignore pricing pages", () => {
  const robots = "User-agent: *\nDisallow: /pricing\n";
  assert.equal(robotsAllows(robots, "/feed"), true);
  assert.equal(robotsAllows(robots, "/pricing/databricks"), false);
  assert.deepEqual(
    newSitemapProducts(
      [
        "https://www.databricks.com/product/lakeflow",
        "https://www.databricks.com/product/pricing",
        "https://docs.databricks.com/aws/en/release-notes/product/2026/october",
      ],
      [],
    ),
    ["https://www.databricks.com/product/lakeflow"],
  );
});

test("the dry-run summary and research checklist name the catalog", () => {
  const summary = renderWeeklySummary({
    today: "2026-10-17",
    catalogVersion: "2026-10-16.5",
    dryRun: true,
    added: [],
    removed: [],
    flags: [],
    notes: ["Offline."],
  });
  assert.match(summary, /Prices updated on 2026-10-17, catalog v2026-10-16.5/);
  assert.match(summary, /Dry run/);
  const issue = renderResearchIssue(["Unknown meter: Example DBU"]);
  assert.match(issue, /\[ \] Unknown meter: Example DBU/);
  assert.equal(renderResearchIssue([]), "");
});

test("research items are new signals, and sitemap xml is only a list of locs", () => {
  const items = researchItems({
    notes: ["New sitemap product: https://www.databricks.com/product/example", "www robots allows /sitemap.xml."],
    beforeState: { unknownMeters: ["Jobs Compute"], staleProductIds: [] },
    afterState: { unknownMeters: ["Jobs Compute", "Example DBU"], staleProductIds: ["old_product"] },
  });
  assert.deepEqual(items, [
    "New sitemap product: https://www.databricks.com/product/example",
    "New Azure meter not in the catalog: Example DBU",
    "Stale manual citation: old_product",
  ]);
  assert.deepEqual(sitemapLocs("<urlset><url><loc>https://example.com/product/a</loc></url></urlset>"), [
    "https://example.com/product/a",
  ]);
});
