import { registerSignal } from "../signal-registry.mjs";
import { newSitemapProducts, robotsAllows, sitemapLocs } from "../weekly-diff.mjs";

const USER_AGENT = "cayfore-weekly-catalog";
const SITEMAP_FETCH_BUDGET = 8;
const WEBSITE_RANK = 2;
const PRODUCT_RANK = 1;
const ORIGINS = ["https://www.databricks.com", "https://docs.databricks.com"];

export const sitemapSignal = {
  id: "databricks-sitemap",
  async collect(env) {
    const notes = [];
    for (const origin of ORIGINS) notes.push(...(await siteNotes(origin, env)));
    return notes;
  },
};

async function siteNotes(origin, env) {
  const robotsUrl = `${origin}/robots.txt`;
  const fetchImpl = env.fetch;
  if (typeof fetchImpl !== "function") throw new Error("sitemap signal needs a fetch port");
  const robots = await fetchImpl(robotsUrl, USER_AGENT);
  if (!robots.ok) throw new Error(`${robotsUrl} returned ${robots.status}`);
  const text = await robots.text();
  const allowed = robotsAllows(text, "/sitemap.xml");
  const notes = [
    allowed ? `${robotsUrl} allows /sitemap.xml.` : `${robotsUrl} disallows /sitemap.xml. The sitemap was not fetched.`,
  ];
  if (!allowed) return notes;
  const fresh = newSitemapProducts(await readSitemap(origin, text, fetchImpl), env.state.sitemapLocs ?? []);
  for (const loc of fresh) notes.push(`New sitemap product: ${loc}`);
  if (env.apply && fresh.length) env.rememberSitemapLocs(fresh);
  return notes;
}

async function readSitemap(origin, robotsText, fetchImpl) {
  const pages = [];
  const queue = [`${origin}/sitemap.xml`];
  const seen = new Set();
  for (let fetches = 0; fetches < SITEMAP_FETCH_BUDGET && queue.length; fetches += 1) {
    const next = queue.shift();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    if (!robotsAllows(robotsText, new URL(next).pathname)) continue;
    const response = await fetchImpl(next, USER_AGENT);
    if (!response.ok) throw new Error(`${next} returned ${response.status}`);
    const locs = sitemapLocs(await response.text());
    pages.push(...locs.filter((loc) => !loc.endsWith(".xml")));
    const nested = locs
      .filter((loc) => loc.startsWith(`${origin}/`) && loc.endsWith(".xml") && !seen.has(loc))
      .sort((left, right) => sitemapRank(right) - sitemapRank(left));
    queue.unshift(...nested);
  }
  return pages;
}

function sitemapRank(loc) {
  if (/website/i.test(loc)) return WEBSITE_RANK;
  if (/product/i.test(loc)) return PRODUCT_RANK;
  return 0;
}

registerSignal(sitemapSignal);
