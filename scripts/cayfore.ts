import { readFileSync } from "node:fs";
import { defaultPlan, planFromUsage, projectSimple } from "../packages/engine/src/index.ts";

const [command, file] = process.argv.slice(2);

if (command === "sql") {
  console.log(readFileSync(new URL("../docs/usage-export.sql", import.meta.url), "utf8"));
} else if (command === "usage") {
  if (!file) fail("usage needs a CSV path");
  const loaded = planFromUsage(defaultPlan(), readFileSync(file, "utf8"));
  if (!loaded.ok) fail(loaded.error);
  const projected = projectSimple(loaded.plan);
  console.log(
    JSON.stringify(
      {
        method: loaded.plan.usageForecast?.method ?? "run-rate",
        mape: loaded.plan.usageForecast?.mape ?? null,
        annual: projected.annual,
        spreadPercent: projected.spreadPercent,
        months: projected.months,
      },
      null,
      2,
    ),
  );
} else if (command === "estimate" || !command) {
  const projected = projectSimple(defaultPlan());
  console.log(
    JSON.stringify(
      {
        annual: projected.annual,
        firstMonth: projected.months[0]?.expected,
        spreadPercent: projected.spreadPercent,
        pricesLine: projected.assumptions.find((line) => line.startsWith("Prices updated")),
      },
      null,
      2,
    ),
  );
} else {
  fail("commands: estimate, usage <file.csv>, sql");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
