// Relative so Vite can load this module while reading its own config. The package
// export is a TypeScript file, which Node cannot load during that config restart.
import { PRODUCT_NAME } from "../../../packages/engine/src/product-name";

/** Public addresses. The stored theme key is `cayfore-theme` and is not derived from these. */
export const APP_NAME = PRODUCT_NAME;
export const REPO = "https://github.com/santoshshinde2012/Catalogfore";
export const BASE_PATH = "/Catalogfore/";
export const SITE = "https://santoshshinde2012.github.io/Catalogfore/";
export const PAGE_TITLE = `${APP_NAME} — Databricks cost calculator and DBU forecast`;
export const PAGE_DESCRIPTION = `${APP_NAME} is a Databricks pricing estimator. Forecast a year of DBU and cloud spend from cloud, workload mix, and growth. Export an Excel workbook. Independent estimate, not a quote.`;
