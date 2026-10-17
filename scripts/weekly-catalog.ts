import { parseProductCatalog } from "../packages/catalog/src/index.ts";
import { createSystemPorts } from "./pipeline-ports.mjs";
import { runWeeklyCatalog } from "./weekly-run.mjs";

const apply = process.argv.includes("--apply");
const offline = process.argv.includes("--offline");

runWeeklyCatalog({
  apply,
  offline,
  ports: { ...createSystemPorts(), parseCatalog: parseProductCatalog },
}).catch((error: unknown) => {
  const exitCode = error instanceof Error && "exitCode" in error ? Number(error.exitCode) : 1;
  if (error instanceof Error && error.message) console.error(error.message);
  process.exit(Number.isFinite(exitCode) ? exitCode : 1);
});
