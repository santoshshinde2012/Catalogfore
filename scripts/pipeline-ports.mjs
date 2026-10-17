import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchAllowed } from "./https-allowlist.mjs";

/** Composition root. The weekly run calls these ports and does not import fs, fetch, or Date. */
export function createSystemPorts() {
  return {
    clock: { today: () => new Date().toISOString().slice(0, 10) },
    readText: (path) => readFileSync(path, "utf8"),
    writeText: (path, text) => writeFileSync(path, text),
    fetch: fetchAllowed,
    spawn: (script) => {
      const child = spawnSync(process.execPath, [script], { stdio: "inherit" });
      return child.status ?? 1;
    },
    gitDirty: () => {
      const status = spawnSync("git", ["status", "--porcelain", "--", "data", "docs/COVERAGE.md"], {
        encoding: "utf8",
      });
      return Boolean(status.stdout?.trim());
    },
    researchPath: () => join(process.env.RUNNER_TEMP ?? tmpdir(), "cayfore-research-issue.md"),
    log: (line) => console.log(line),
  };
}
