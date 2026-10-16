import { readFileSync } from "node:fs";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("Pass a semver version, without the v prefix.");
  process.exit(1);
}
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const heading = new RegExp(`^## \\[?${version}\\]?\\s*$`, "m");
if (!heading.test(changelog)) {
  console.error(`CHANGELOG.md has no section for ${version}.`);
  process.exit(1);
}
const start = changelog.search(heading);
const rest = changelog.slice(start).split("\n").slice(1).join("\n");
const next = rest.search(/^## /m);
process.stdout.write((next === -1 ? rest : rest.slice(0, next)).trim() + "\n");
