import assert from "node:assert/strict";
import test from "node:test";
import { registerSignal, signalSources } from "./signal-registry.mjs";
import "./signals/load.mjs";

test("catalog signals share one collect contract", () => {
  const sources = signalSources();
  assert.deepEqual(
    sources.map((source) => source.id),
    ["databricks-rss", "databricks-sitemap"],
  );
  for (const source of sources) {
    assert.equal(typeof source.id, "string");
    assert.equal(typeof source.collect, "function");
  }
  assert.throws(() => registerSignal({ id: "databricks-rss", collect: async () => [] }), /duplicate signal/);
  assert.throws(() => registerSignal({ id: "missing-collect" }), /needs an id and collect/);
});
