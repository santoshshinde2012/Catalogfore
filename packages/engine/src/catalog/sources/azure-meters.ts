import document from "../../../../../data/azure-dbu-meters.json";
import type { AzureDbuMeter } from "../dbu-rate-types.js";

/** Sole importer of the captured Azure DBU meters. */
export const azureMetersUpdatedOn = document.updatedOn;
export const azureDbuMeters = document.meters as AzureDbuMeter[];
