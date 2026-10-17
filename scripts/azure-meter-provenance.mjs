/** A partial or failed refresh retains each old meter's actual observation date. */
export function mergeAzureMeters(previous, observed, region) {
  const meters = new Map(previous.filter((row) => row.region === region).map((row) => [row.sku, row]));
  for (const row of observed) {
    if (row.region !== region || !row.asOf)
      throw new Error("Fresh Azure meters need their region and observation date");
    meters.set(row.sku, row);
  }
  return [...meters.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}
