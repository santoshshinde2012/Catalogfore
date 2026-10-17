import { readFileSync } from "node:fs";

/** Release tags select an exact Markdown section, never a regular expression. */
export function changelogNotes(changelog, version) {
  if (typeof version !== "string" || version.trim() !== version || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("Pass a semver version, without the v prefix.");
  }
  const lines = changelog.split(/\r?\n/);
  const headings = [`## ${version}`, `## [${version}]`];
  const start = lines.findIndex((line) => headings.includes(line.trimEnd()));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${version}.`);
  const rest = lines.slice(start + 1);
  const next = rest.findIndex((line) => line.startsWith("## "));
  return (next === -1 ? rest : rest.slice(0, next)).join("\n").trim() + "\n";
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("changelog-notes.mjs")) {
  try {
    const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    process.stdout.write(changelogNotes(changelog, process.argv[2]));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not read release notes.");
    process.exit(1);
  }
}
