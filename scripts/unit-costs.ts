import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import { buildUnitCostCatalog, unitCostCsv, unitCostJson } from "../packages/engine/src/unit-costs/index.ts";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check") || args.length > 1) {
  console.error("Usage: npm run export:unit-costs [-- --check]");
  process.exit(1);
}

const catalog = buildUnitCostCatalog();
const artifacts = [
  { name: "unit-costs.json", content: unitCostJson(catalog) },
  { name: "unit-costs.csv", content: unitCostCsv(catalog.rows) },
];
let stale = false;
for (const { name, content } of artifacts) {
  const path = new URL(`../data/${name}.gz`, import.meta.url);
  if (args.includes("--check")) {
    const stored = await readFile(path)
      .then((bytes) => gunzipSync(bytes).toString("utf8"))
      .catch(() => null);
    if (stored !== content) {
      console.error(`${name}.gz is missing, invalid, or stale. Run npm run export:unit-costs.`);
      stale = true;
    }
  } else {
    await writeFile(new URL(`../data/${name}`, import.meta.url), content);
    await writeFile(path, gzipSync(content, { level: 9 }));
  }
}
if (stale) process.exit(1);
console.log(
  `${args.includes("--check") ? "Verified" : "Wrote"} CSV and JSON: ${catalog.products.length} products/concepts, ${catalog.rows.length} unit-cost rows, catalog ${catalog.catalogVersion}.`,
);
