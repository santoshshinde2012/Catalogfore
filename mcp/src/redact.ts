/** Keep the pattern aligned with scripts/workspace-host.mjs. Errors must not print a token. */
export function redactSecrets(text: string): string {
  return text
    .replace(/dapi[0-9a-f-]{16,}/gi, "[redacted]")
    .replace(/([?&](?:key|token|access_token)=)[^&\s]+/gi, "$1[redacted]");
}
