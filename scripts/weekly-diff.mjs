/** Pure diff helpers for the weekly catalog job. No network. */

export function rateChangeFlags(beforeRows, afterRows, keyOf, valueOf, threshold = 0.2) {
  const before = new Map((beforeRows ?? []).map((row) => [keyOf(row), valueOf(row)]));
  const after = new Map((afterRows ?? []).map((row) => [keyOf(row), valueOf(row)]));
  const flags = [];
  const added = [];
  const removed = [];
  for (const [key, next] of after) {
    if (!before.has(key)) {
      added.push(key);
      continue;
    }
    const previous = before.get(key);
    if (typeof previous !== "number" || typeof next !== "number" || previous === 0) continue;
    const change = Math.abs(next - previous) / Math.abs(previous);
    if (change > threshold) flags.push({ key, previous, next, change });
  }
  for (const key of before.keys()) if (!after.has(key)) removed.push(key);
  return { flags, added, removed };
}

export function skuRateFlags(before, after, threshold = 0.2) {
  const rows = (book) => {
    const list = [];
    for (const [cloud, tiers] of Object.entries(book?.rates ?? {})) {
      for (const [tier, rates] of Object.entries(tiers ?? {})) {
        for (const [sku, rate] of Object.entries(rates ?? {})) list.push({ key: `${cloud}:${tier}:${sku}`, rate });
      }
    }
    return list;
  };
  return rateChangeFlags(
    rows(before),
    rows(after),
    (row) => row.key,
    (row) => row.rate,
    threshold,
  );
}

export function nextCatalogVersion(version, today) {
  const match = /^(\d{4}-\d{2}-\d{2})\.(\d+)$/.exec(String(version ?? ""));
  if (!match) throw new Error(`catalog version is not dated: ${version}`);
  if (match[1] === today) return `${today}.${Number(match[2]) + 1}`;
  return `${today}.1`;
}

export function robotsAllows(text, path) {
  const lines = String(text ?? "").split(/\r?\n/);
  let star = false;
  const disallows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") star = value === "*";
    else if (star && key === "disallow" && value) disallows.push(value);
  }
  return !disallows.some((rule) => rule === "/" || path.startsWith(rule));
}

export function newSitemapProducts(locs, seen) {
  const known = new Set(seen ?? []);
  return [...new Set(locs ?? [])].filter((loc) => isProductPage(loc) && !known.has(loc)).sort();
}

function isProductPage(loc) {
  try {
    const url = new URL(loc);
    return (
      url.hostname === "www.databricks.com" &&
      /^\/product\/[^/]+\/?$/.test(url.pathname) &&
      !/pricing/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function renderWeeklySummary(report) {
  const lines = [
    "# Weekly catalog check",
    "",
    `Prices updated on ${report.today}, catalog v${report.catalogVersion}.`,
    "",
    report.dryRun
      ? "Dry run. No files were written and no pull request was opened."
      : "Review this diff. The workflow does not merge it.",
    "",
    "## New services",
    "",
    list(report.added),
    "",
    "## Price changes over 20%",
    "",
    report.flags.length
      ? report.flags
          .map((flag) => `- \`${flag.key}\`: ${flag.previous} -> ${flag.next} (${Math.round(flag.change * 100)}%)`)
          .join("\n")
      : "None.",
    "",
    "## Removed items",
    "",
    list(report.removed),
    "",
    "## Public sources",
    "",
    report.notes.length ? report.notes.map((note) => `- ${note}`).join("\n") : "- No extra notes.",
    "",
  ];
  return lines.join("\n");
}

export function researchItems({ notes = [], beforeState = {}, afterState = {} }) {
  const items = [];
  for (const note of notes) {
    if (note.startsWith("New sitemap product:") || note.startsWith("New release note:")) items.push(note);
  }
  const seenMeters = new Set(beforeState.unknownMeters ?? []);
  for (const name of afterState.unknownMeters ?? []) {
    if (!seenMeters.has(name)) items.push(`New Azure meter not in the catalog: ${name}`);
  }
  const seenStale = new Set(beforeState.staleProductIds ?? []);
  for (const id of afterState.staleProductIds ?? []) {
    if (!seenStale.has(id)) items.push(`Stale manual citation: ${id}`);
  }
  return [...new Set(items)];
}

export function sitemapLocs(xml) {
  return [...String(xml ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

export function renderResearchIssue(items) {
  if (!items.length) return "";
  return [
    "The weekly catalog check found public signals that are not in the Catalogfore catalog yet.",
    "",
    "This is a research checklist. It does not change a rate by itself.",
    "",
    ...items.map((item) => `- [ ] ${item}`),
    "",
    "Do not scrape Databricks pricing pages. Use a cited public source, then update the catalog in a reviewed pull request.",
  ].join("\n");
}

function list(values) {
  return values?.length ? values.map((value) => `- \`${value}\``).join("\n") : "None.";
}
