import { createHash } from "node:crypto";

/**
 * Production Content-Security-Policy.
 * script-src has no unsafe-inline and no unsafe-eval. The JSON-LD block is hashed.
 * The theme boot script and the module loader are hashed when the landing page is prerendered.
 * style-src keeps unsafe-inline. A hash in style-src-elem would ignore unsafe-inline and
 * block the style tags the animation library inserts at runtime. React width styles need
 * style-src-attr unsafe-inline.
 * frame-ancestors is not included: a meta policy cannot set it, and GitHub Pages cannot
 * send it as a response header.
 */
export function productionCsp(jsonLd: string): string {
  const hash = createHash("sha256").update(jsonLd).digest("base64");
  return [
    "default-src 'self'",
    `script-src 'self' 'sha256-${hash}'`,
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
