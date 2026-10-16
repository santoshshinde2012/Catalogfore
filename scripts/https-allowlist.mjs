/** Hosts the price refresh and catalog watch are allowed to call. */
const ALLOWED_HOSTS = new Set([
  "prices.azure.com",
  "pricing.us-east-1.amazonaws.com",
  "spot-bid-advisor.s3.amazonaws.com",
  "cloudbilling.googleapis.com",
  "www.databricks.com",
]);

export function assertAllowedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("HTTPS is required");
  if (url.username || url.password) throw new Error("Credentials are not allowed in a fetch URL");
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(`Host is not allowed: ${url.hostname}`);
  return url;
}

export async function fetchAllowed(value, userAgent) {
  const allowed = assertAllowedUrl(value);
  return fetch(allowed, {
    headers: { "user-agent": userAgent },
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
}

export function redactUrl(value) {
  const url = new URL(value);
  for (const key of ["key", "access_token", "token"]) {
    if (url.searchParams.has(key)) url.searchParams.set(key, "[redacted]");
  }
  return url.toString();
}
