import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkDocs, documentationFiles, localLinks } from "./check-docs.mjs";

test("an unfinished long link does not stall documentation checks", () => {
  const moduleUrl = new URL("./check-docs.mjs", import.meta.url).href;
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { localLinks } from ${JSON.stringify(moduleUrl)}; localLinks('[broken](docs/' + 'x'.repeat(10000));`,
    ],
    { timeout: 3000, encoding: "utf8" },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});

test("finds local links, images, and references while ignoring remote URLs and code", () => {
  assert.deepEqual(localLinks("[split](guide<!-- comment -->.md)"), []);
  assert.deepEqual(localLinks("[split](guide`code`.md)"), []);
  assert.deepEqual(
    localLinks(
      [
        "[guide](docs/guide.md#start) ![image](docs/picture.png)",
        '[ref]: <docs/a file.md> "A title"',
        "[nested](docs/a(b).md) [root](/LICENSE)",
        "[titled](docs/title.md (Guide title))",
        "[web](https://example.com) [email](mailto:a@example.com) [anchor](#local)",
        "`[code](missing.md)` <!-- [draft](missing.md) -->",
        "```md",
        "[sample](missing.md)",
        "```",
        "~~~",
        "[sample](missing.md)",
        "~~~",
      ].join("\n"),
    ),
    ["docs/guide.md#start", "docs/picture.png", "docs/a(b).md", "/LICENSE", "docs/title.md", "docs/a file.md"],
  );
});

test("checks relative destinations and reports missing, escaping, and malformed links", (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "catalogfore-docs-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "docs"));
  mkdirSync(path.join(root, ".github"));
  writeFileSync(path.join(root, "LICENSE"), "MIT");
  writeFileSync(path.join(root, "docs", "a file.md"), "# Guide");
  writeFileSync(path.join(root, "README.md"), "[guide](docs/a%20file.md#guide)");
  writeFileSync(
    path.join(root, "docs", "index.md"),
    [
      "[license](../LICENSE) [root](/LICENSE) [directory](../docs)",
      "[missing](missing.md) [escape](../../outside.md) [invalid](bad%ZZ.md)",
    ].join("\n"),
  );
  const files = documentationFiles(root);
  assert.deepEqual(files, ["README.md", "docs/a file.md", "docs/index.md"]);
  const result = checkDocs(root, files);
  assert.equal(result.checked, 6);
  assert.deepEqual(result.failures, [
    "docs/index.md: missing local destination: missing.md",
    "docs/index.md: link leaves the repository: ../../outside.md",
    "docs/index.md: invalid URL encoding in bad%ZZ.md",
  ]);
});
