import assert from "node:assert/strict";
import test from "node:test";
import { allowedRedirect, assertAllowedUrl, redactUrl } from "./https-allowlist.mjs";

test("price hosts must be https and on the allow list", () => {
  assert.equal(assertAllowedUrl("https://prices.azure.com/api/retail/prices").hostname, "prices.azure.com");
  assert.throws(() => assertAllowedUrl("http://prices.azure.com/api"), /HTTPS/);
  assert.throws(() => assertAllowedUrl("https://user:pass@prices.azure.com/api"), /Credentials/);
  assert.throws(() => assertAllowedUrl("https://169.254.169.254/latest"), /not allowed/);
  assert.throws(() => assertAllowedUrl("https://evil.com"), /not allowed/);
});

test("redirects stay on an allow-listed host", () => {
  assert.equal(
    allowedRedirect("https://docs.databricks.com/sitemap.xml", "/aws/en/sitemap.xml"),
    "https://docs.databricks.com/aws/en/sitemap.xml",
  );
  assert.throws(
    () => allowedRedirect("https://www.databricks.com/sitemap.xml", "https://evil.com/sitemap.xml"),
    /not allowed/,
  );
});

test("a billing key in a URL is redacted before it can be logged", () => {
  const redacted = redactUrl("https://cloudbilling.googleapis.com/v1/services/abc/skus?key=secret-value&pageSize=10");
  assert.equal(redacted.includes("secret-value"), false);
  assert.match(redacted, /key=%5Bredacted%5D|key=\[redacted\]/);
});
