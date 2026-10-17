import { readFileSync } from "node:fs";

export function missingIntegrity(lock) {
  const missing = [];
  for (const [name, pkg] of Object.entries(lock.packages ?? {})) {
    if (!name.startsWith("node_modules/") || pkg.link) continue;
    if (typeof pkg.integrity !== "string" || !pkg.integrity.startsWith("sha512-")) missing.push(name);
  }
  return missing;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("lockfile-integrity.mjs")) {
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  if (lock.lockfileVersion < 3) {
    console.error("expected lockfileVersion 3");
    process.exit(1);
  }
  const missing = missingIntegrity(lock);
  if (missing.length) {
    console.error(missing.join("\n"));
    process.exit(1);
  }
  console.log("lockfile integrity ok", Object.keys(lock.packages).length);
}
