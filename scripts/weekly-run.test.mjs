import assert from "node:assert/strict";
import test from "node:test";
import { createSystemPorts } from "./pipeline-ports.mjs";
import { runWeeklyCatalog } from "./weekly-run.mjs";

test("an offline dry run uses the clock and does not fetch, spawn, or write", async () => {
  let fetches = 0;
  let writes = 0;
  let spawns = 0;
  const lines = [];
  await runWeeklyCatalog({
    apply: false,
    offline: true,
    ports: {
      ...createSystemPorts(),
      clock: { today: () => "2026-10-17" },
      fetch: async () => {
        fetches += 1;
        throw new Error("network");
      },
      writeText: () => {
        writes += 1;
      },
      spawn: () => {
        spawns += 1;
        return 1;
      },
      log: (line) => lines.push(line),
      parseCatalog: (catalog) => catalog,
    },
  });
  assert.equal(fetches, 0);
  assert.equal(writes, 0);
  assert.equal(spawns, 0);
  assert.match(lines.join("\n"), /Prices updated on 2026-10-17/);
  assert.match(lines.join("\n"), /Dry run/);
  assert.match(lines.join("\n"), /Offline/);
});

function appliedRun({ dirty = true, reportExitCode = 0 } = {}) {
  const system = createSystemPorts();
  const catalogPath = new URL("../data/product-catalog.json", import.meta.url);
  const original = JSON.parse(system.readText(catalogPath));
  const files = new Map([
    [String(catalogPath), JSON.stringify({ ...original, version: "2026-01-01.1", verifiedOn: "2026-01-01" })],
  ]);
  const reportVersions = [];
  const ports = {
    ...system,
    clock: { today: () => "2026-01-02" },
    readText: (path) => files.get(String(path)) ?? system.readText(path),
    writeText: (path, text) => files.set(String(path), text),
    // No new RSS posts, and both sites disallow sitemap requests.
    fetch: async () => ({ ok: true, text: async () => "User-agent: *\nDisallow: /\n" }),
    spawn: (script) => {
      if (script === "scripts/coverage-report.mjs" || script === "scripts/rate-confidence.mjs") {
        reportVersions.push({ script, version: JSON.parse(ports.readText(catalogPath)).version });
        return reportExitCode;
      }
      return 0;
    },
    gitDirty: () => dirty,
    parseCatalog: (catalog) => catalog,
    log: () => {},
  };
  return { ports, reportVersions, catalogPath };
}

test("an applied refresh rebuilds documentation and confidence against the final catalog version", async () => {
  const { ports, reportVersions, catalogPath } = appliedRun();
  await runWeeklyCatalog({ apply: true, offline: false, ports });
  assert.equal(JSON.parse(ports.readText(catalogPath)).version, "2026-01-02.1");
  assert.deepEqual(reportVersions, [
    { script: "scripts/coverage-report.mjs", version: "2026-01-02.1" },
    { script: "scripts/rate-confidence.mjs", version: "2026-01-02.1" },
  ]);
});

test("an unchanged refresh still verifies generated reports against the existing version", async () => {
  const { ports, reportVersions, catalogPath } = appliedRun({ dirty: false });
  await runWeeklyCatalog({ apply: true, offline: false, ports });
  assert.equal(JSON.parse(ports.readText(catalogPath)).version, "2026-01-01.1");
  assert.equal(reportVersions.length, 2);
  assert.ok(reportVersions.every((report) => report.version === "2026-01-01.1"));
});

test("a report generation failure fails the refresh", async () => {
  const { ports } = appliedRun({ reportExitCode: 7 });
  await assert.rejects(runWeeklyCatalog({ apply: true, offline: false, ports }), {
    message: "Could not rebuild scripts/coverage-report.mjs",
    exitCode: 7,
  });
});

test("offline apply is rejected before any source access or file writes", async () => {
  await assert.rejects(runWeeklyCatalog({ apply: true, offline: true, ports: {} }), /--apply requires live/);
});
