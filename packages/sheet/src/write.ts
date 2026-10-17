import { writeFileSync } from "node:fs";
import type { PortfolioProjection } from "@cayfore/engine";
import { buildForecastWorkbook } from "./workbook.js";

export async function writeForecastWorkbook(
  result: PortfolioProjection,
  path: string,
  exportedOn = new Date(),
): Promise<void> {
  writeFileSync(path, await buildForecastWorkbook(result, exportedOn));
}
