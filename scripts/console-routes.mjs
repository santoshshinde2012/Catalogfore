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

const browser = await chromium.launch();
for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const label = viewport.name;
  watch(page, label);

  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();

  await page.locator("#forecast").scrollIntoViewIfNeeded();
  await page.getByTestId("year-total").waitFor();

  const advanced = page.getByRole("button", { name: "Advanced", exact: true });
  if (viewport.name === "mobile") {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitem", { name: "Advanced" }).click();
  } else {
    await advanced.last().click();
  }
  await page.getByRole("heading", { name: "By product" }).waitFor();

  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByText("Data Engineering").waitFor();
  await page.keyboard.press("Escape");

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
