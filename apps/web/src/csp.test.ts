import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { productionCsp } from "./csp";

describe("production CSP", () => {
  it("hashes JSON-LD and does not allow eval or an inline script", () => {
    const json = JSON.stringify({ name: "Cayfore" });
    const policy = productionCsp(json);
    const hash = createHash("sha256").update(json).digest("base64");
    expect(policy).toContain(`'sha256-${hash}'`);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("frame-ancestors");
    expect(policy).not.toContain("plausible.io");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("style-src-elem");
    expect(policy.startsWith("default-src 'self'")).toBe(true);
  });
});
