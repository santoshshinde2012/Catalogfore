import document from "../../../../../data/cloud-vm-prices.json";
import type { Cloud } from "../../types.js";

/** Sole importer of the captured virtual-machine price book. */
export const vmPricesUpdatedOn = document.updatedOn;
export const referenceRegion = document.referenceRegion as Record<Cloud, string>;
export const vmPriceRows = document.prices;
