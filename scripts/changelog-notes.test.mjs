import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { changelogNotes } from "./changelog-notes.mjs";

test("release notes select the exact plain or bracketed version and keep subsections", () => {
  for (const heading of ["## 1.2.3", "## [1.2.3]"]) {
    const changelog = `# Changelog\n\n## Unreleased\n\nFuture.\n\n${heading}  \r\n\r\n### Fixed\r\n\r\n- Literal notes.\r\n\r\n## 1.2.2\n\nOlder.\n`;
    assert.equal(changelogNotes(changelog, "1.2.3"), "### Fixed\n\n- Literal notes.\n");
  }
});

test("version dots cannot select another heading and brackets must be paired", () => {
  for (const heading of ["## 1x2x3", "## [1.2.3", "## 1.2.3]", "## 1.2.30", "## 1.2.3 - 2026-10-18"]) {
    assert.throws(() => changelogNotes(`${heading}\nWrong release.\n`, "1.2.3"), /has no section for 1\.2\.3/);
  }
  assert.equal(changelogNotes("## 1x2x3\nWrong.\n\n## 1.2.3\nCorrect.\n", "1.2.3"), "Correct.\n");
});

test("release versions reject regex payloads and non-version input", () => {
  for (const version of [
    undefined,
    null,
    123,
    "",
    "v1.2.3",
    "1.2.3|.*",
    "(a+)+$",
    "1.2.3\n## Unreleased",
    "1.2.3\n",
    "1.2.3\r",
    "1.2.3 ",
  ]) {
    assert.throws(() => changelogNotes("## 1.2.3\nNotes.\n", version), /Pass a semver version/);
  }
});

test("release CLI writes selected notes and fails without leaking other sections", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cayfore-changelog-"));
  try {
    const script = path.join(root, "scripts", "changelog-notes.mjs");
    await mkdir(path.dirname(script));
    await writeFile(script, await readFile(new URL("./changelog-notes.mjs", import.meta.url)));
    await writeFile(
      path.join(root, "CHANGELOG.md"),
      "## Unreleased\nFuture notes.\n\n## [1.2.3]\nPublished notes.\n\n## 1.2.2\nOld notes.\n",
    );
    const selected = spawnSync(process.execPath, [script, "1.2.3"], { encoding: "utf8" });
    assert.equal(selected.status, 0, selected.stderr);
    assert.equal(selected.stdout, "Published notes.\n");
    assert.equal(selected.stderr, "");
    for (const [version, message] of [
      ["1.2.3|.*", "Pass a semver version, without the v prefix.\n"],
      ["9.9.9", "CHANGELOG.md has no section for 9.9.9.\n"],
    ]) {
      const rejected = spawnSync(process.execPath, [script, version], { encoding: "utf8" });
      assert.equal(rejected.status, 1);
      assert.equal(rejected.stdout, "");
      assert.equal(rejected.stderr, message);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
