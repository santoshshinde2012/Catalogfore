/** Hosts the price refresh and catalog watch are allowed to call. */
const ALLOWED_HOSTS = new Set([
  "prices.azure.com",
  "pricing.us-east-1.amazonaws.com",
  "spot-bid-advisor.s3.amazonaws.com",
  "cloudbilling.googleapis.com",
  "www.databricks.com",
  "docs.databricks.com",
]);

export function assertAllowedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("HTTPS is required");
  if (url.username || url.password) throw new Error("Credentials are not allowed in a fetch URL");
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(`Host is not allowed: ${url.hostname}`);
  return url;
}

/** A redirect is followed only when the next URL is still an allow-listed HTTPS host. */
export function allowedRedirect(current, location) {
  return assertAllowedUrl(new URL(location, current)).toString();
}

export async function fetchAllowed(value, userAgent) {
  let current = assertAllowedUrl(value).toString();
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current, {
      headers: { "user-agent": userAgent },
      signal: AbortSignal.timeout(30_000),
      redirect: "manual",
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("Redirect was missing a location");
    current = allowedRedirect(current, location);
  }
  throw new Error("Too many redirects");
}

export function redactUrl(value) {
  const url = new URL(value);
  for (const key of ["key", "access_token", "token"]) {
    if (url.searchParams.has(key)) url.searchParams.set(key, "[redacted]");
  }
  return url.toString();
}
