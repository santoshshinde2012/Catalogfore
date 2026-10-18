import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const NOTES_HEADING = "## What is not a separate dollar rate";

export function publishedLabel(listPrice) {
  if (listPrice === "distinct") return "Yes";
  if (listPrice === "reused_sku") return "No distinct rate";
  return "No";
}

export function renderProductsMarkdown(catalog, notes) {
  const labels = Object.fromEntries(catalog.categories.map((category) => [category.id, category.label]));
  const header = ["Product", "Category", "Billing unit", "Published?", "Confidence", "Automation", "Source"];
  const rows = catalog.products.map((product) => [
    product.name,
    labels[product.category] ?? product.category,
    product.billingUnit,
    publishedLabel(product.listPrice),
    product.confidence,
    product.automation,
    `${product.source.title} (${product.source.fetchedOn})`,
  ]);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
  const body = lines.join("\n");
  return `# Databricks product inventory

Checked ${catalog.verifiedOn}. Catalog version \`${catalog.version}\`. Figures are list estimates, not a quote. Catalogfore is not affiliated with Databricks.

A row marked **No** has no resolved list rate in this catalog; its missing cost remains a gap in the known subtotal. **No distinct rate** means the line reuses another SKU and says so. **Yes** means a stored rate is applied, with its actual component evidence shown in Unit costs. Captured first-party prices take precedence over references. Product-level confidence is catalog metadata; it does not verify every region or consumption assumption. Manual citations go stale after 120 days.

The four-input page does not list these products. It maps Pipelines and jobs to classic jobs, Dashboards to serverless SQL, and Models to the Llama 3.1 8B foundation-model line inside \`projectSimple\`. Advanced adds any row below. Sizes (SQL 2XS–4XL, Photon, spot) stay inputs on the existing editors.

The table is generated from \`data/product-catalog.json\` by \`scripts/products-doc.mjs\`.

${body}

${notes.trim()}
`;
}

export async function writeProductsDoc() {
  const catalog = JSON.parse(await readFile(new URL("data/product-catalog.json", root), "utf8"));
  const current = await readFile(new URL("docs/PRODUCTS.md", root), "utf8");
  const notesAt = current.indexOf(NOTES_HEADING);
  if (notesAt < 0) throw new Error(`docs/PRODUCTS.md is missing ${NOTES_HEADING}`);
  const markdown = renderProductsMarkdown(catalog, current.slice(notesAt));
  await writeFile(new URL("docs/PRODUCTS.md", root), markdown);
  return catalog.products.length;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("products-doc.mjs")) {
  writeProductsDoc()
    .then((count) => console.log(`products doc: ${count} rows`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
