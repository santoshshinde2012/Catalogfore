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
