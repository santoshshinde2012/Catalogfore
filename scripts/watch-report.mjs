const RSS_FEED = "https://www.databricks.com/feed";

export function renderWatchReport({ version, stale, unknown, posts, liveNote }) {
  const lines = [
    `# Product catalog watch`,
    ``,
    `Catalog \`${version}\`. This report is estimates and public list signals, not a quote.`,
    ``,
    liveNote
      ? `Live check: ${liveNote}`
      : `Live check: Azure Retail Prices for every rate-card region, and the Databricks RSS feed.`,
    ``,
    `## Stale manual sources`,
    ``,
  ];
  lines.push(
    stale.length ? stale.map((id) => `- \`${id}\``).join("\n") : "None. Manual citations are within 120 days.",
  );
  lines.push("", "## Azure meters not in the catalog", "");
  lines.push(
    unknown.length
      ? unknown.map((name) => `- ${name}`).join("\n")
      : "None beyond the known meter list. Photon, free-trial, and POC meters are ignored.",
  );
  lines.push("", "## Release-note and blog titles that may be billable", "");
  lines.push(
    posts.length
      ? posts.map((post) => `- [${post.title}](${post.link || RSS_FEED})`).join("\n")
      : "No new matching titles since the last watch.",
  );
  lines.push("");
  return lines.join("\n");
}
