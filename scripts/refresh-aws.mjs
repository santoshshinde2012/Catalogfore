import { assertAllowedUrl } from "./https-allowlist.mjs";

export async function streamAws(region, instanceIds) {
  if (!/^[a-z0-9-]+$/.test(region)) throw new Error("Unexpected AWS region");
  const url = assertAllowedUrl(
    `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${region}/index.csv`,
  );
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 120_000);
  const wanted = new Set(instanceIds);
  const found = new Map();
  const decoder = new TextDecoder();
  let buffer = "";
  let header = null;
  let index = null;
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "cayfore-price-refresh" },
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok || !response.body) throw new Error(`${response.status} ${url.hostname}`);
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!header) {
          if (line.startsWith('"SKU"')) {
            header = splitCsvLine(line);
            index = {
              term: header.indexOf("TermType"),
              unit: header.indexOf("Unit"),
              price: header.indexOf("PricePerUnit"),
              instance: header.indexOf("Instance Type"),
              tenancy: header.indexOf("Tenancy"),
              os: header.indexOf("Operating System"),
              capacity: header.indexOf("CapacityStatus"),
              preinstalled: header.indexOf("Pre Installed S/W"),
            };
          }
          continue;
        }
        if (!wanted.size) continue;
        const hit = [...wanted].find((id) => line.includes(`"${id}"`));
        if (!hit) continue;
        const row = splitCsvLine(line);
        if (row[index.term] !== "OnDemand" || row[index.unit] !== "Hrs") continue;
        if (row[index.tenancy] !== "Shared" || row[index.os] !== "Linux") continue;
        if (row[index.capacity] !== "Used") continue;
        if (index.preinstalled >= 0 && row[index.preinstalled] && row[index.preinstalled] !== "NA") continue;
        const instanceId = row[index.instance];
        if (!wanted.has(instanceId)) continue;
        const hourly = Number(row[index.price]);
        if (!Number.isFinite(hourly) || hourly <= 0) continue;
        const current = found.get(instanceId);
        if (current == null || hourly < current) found.set(instanceId, hourly);
        if (found.size === wanted.size) controller.abort();
      }
    }
  } catch (error) {
    if (timedOut) throw new Error("AWS price download timed out");
    if (!(error instanceof Error) || error.name !== "AbortError") throw error;
  } finally {
    clearTimeout(timer);
  }
  return [...found.entries()].map(([instanceId, onDemandHourly]) => ({ instanceId, onDemandHourly }));
}

export function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells;
}
