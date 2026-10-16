import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { missingIntegrity } from "./lockfile-integrity.mjs";

test("the lockfile records a sha512 integrity for every installed package", async () => {
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(missingIntegrity(lock).length, 0);
  assert.deepEqual(missingIntegrity({ packages: { "node_modules/left": {} } }), ["node_modules/left"]);
  assert.deepEqual(missingIntegrity({ packages: { "apps/web": { name: "@cayfore/web" } } }), []);
});
