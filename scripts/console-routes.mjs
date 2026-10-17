import { chromium } from "@playwright/test";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:4175/cayfore/";
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const problems = [];

function watch(page, label) {
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || type === "warning") {
      problems.push(`${label} console.${type}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`${label} pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.startsWith("data:")) return;
    problems.push(`${label} request failed: ${request.failure()?.errorText ?? "failed"} ${url}`);
  });
}

async function workspaceAction(page, name) {
  await page.getByRole("banner").getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${name}\\b`) }).click();
}

const browser = await chromium.launch();
for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const label = viewport.name;
  watch(page, label);

  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();

  await page.locator("#forecast").scrollIntoViewIfNeeded();
  await page.getByTestId("year-total").waitFor();

  const planHash = new URL(page.url()).hash;
  await page.getByRole("banner").getByRole("button", { name: "Product map", exact: true }).click();
  await page.locator("#product-map").waitFor();
  await page.getByLabel("Search Databricks products", { exact: true }).fill("Unity Catalog");
  await page
    .getByRole("region", { name: "Product directory", exact: true })
    .getByRole("button", { name: /^Unity Catalog\b/ })
    .click();
  await page.getByRole("region", { name: "Product details", exact: true }).waitFor();
  if (new URL(page.url()).hash !== planHash) throw new Error(`${label}: product map changed the saved plan`);
  await page.getByRole("button", { name: "Inspect unit costs", exact: true }).click();
  await page.locator("#unit-costs").waitFor();
  await page.getByRole("region", { name: "Unit cost details", exact: true }).waitFor();
  if (new URL(page.url()).hash !== planHash) throw new Error(`${label}: unit costs changed the saved plan`);
  await workspaceAction(page, "Forecast");
  await page.getByTestId("year-total").waitFor();

  await workspaceAction(page, "Advanced");
  await page.getByRole("heading", { name: "By product" }).waitFor();

  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByText("Data Engineering").first().waitFor();
  await page.keyboard.press("Escape");

  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "10%", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  if ((await page.getByRole("radio", { name: "10%", exact: true }).getAttribute("aria-checked")) !== "true") {
    throw new Error(`${label}: saved growth was not restored`);
  }
  await workspaceAction(page, "Switch to dark theme");
  await page.locator('html[data-theme="dark"]').waitFor();
  await page.reload({ waitUntil: "networkidle" });
  if ((await page.locator("html").getAttribute("data-theme")) !== "dark")
    throw new Error(`${label}: saved dark theme was not restored`);
  await page.getByRole("textbox", { name: "Scenario name" }).fill("Production baseline");
  await page.getByRole("button", { name: "Save scenario", exact: true }).click();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open Production baseline", exact: true }).waitFor();

  await page.goto(new URL("faq.html", base).href, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.close();
}
await browser.close();

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("console routes clean", viewports.map((viewport) => viewport.name).join(", "));
