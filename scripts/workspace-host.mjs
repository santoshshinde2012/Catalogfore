/**
 * Guard for a future workspace client. The CLI and MCP server do not call Databricks.
 * A token is read from the environment only, and this module never prints it.
 */
const SUFFIXES = [".cloud.databricks.com", ".gcp.databricks.com", ".azuredatabricks.net", ".databricks.azure.us"];

export const WORKSPACE_TIMEOUT_MS = 30_000;

export function assertWorkspaceHost(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Workspace host must use HTTPS");
  if (url.username || url.password) throw new Error("Workspace URL must not contain credentials");
  if (url.port && url.port !== "443") throw new Error("Workspace host must use port 443");
  const host = url.hostname.toLowerCase();
  const allowed = SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
  if (!allowed) throw new Error("Workspace host is not a Databricks workspace");
  return `https://${host}`;
}

export function readWorkspaceEnv(env = process.env) {
  const host = env.DATABRICKS_HOST?.trim();
  const token = env.DATABRICKS_TOKEN?.trim();
  if (!host || !token) throw new Error("DATABRICKS_HOST and DATABRICKS_TOKEN are required");
  return { host: assertWorkspaceHost(host), token, timeoutMs: WORKSPACE_TIMEOUT_MS };
}

export function redactSecrets(text) {
  return String(text)
    .replace(/dapi[0-9a-f-]{16,}/gi, "[redacted]")
    .replace(/([?&](?:key|token|access_token)=)[^&\s]+/gi, "$1[redacted]");
}
