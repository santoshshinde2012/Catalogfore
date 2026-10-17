import { fetchAllowed, redactUrl } from "./https-allowlist.mjs";

export const today = new Date().toISOString().slice(0, 10);
export const SPOT_ADVISOR = "https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json";
export const DATABRICKS_PROBES = [
  "https://www.databricks.com/en-pricing-assets/page-data/app-data.json",
  "https://www.databricks.com/page-data/product/pricing/page-data.json",
];

export async function fetchText(url, attempt = 0) {
  const response = await fetchAllowed(url, "cayfore-price-refresh");
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${redactUrl(url)}`);
  return response.text();
}

export async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}
