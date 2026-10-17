import { listRegions } from "./catalog.js";
import { calendarDay, isMonth } from "./forecast/calendar.js";
import { cloudOf, isRecord, tierOf } from "./portfolio-fields.js";
import { err, ok, type Result } from "./result.js";

import { finite, text, oneOf } from "./saved-values.js";
import { validWorkload } from "./saved-workload.js";
import { validSimple, validUsage } from "./saved-assumptions.js";

/** Validation precedes normalization so malformed files cannot replace an active plan. */
export function savedPortfolioInput(input: unknown): Result<Record<string, unknown>> {
  if (!isRecord(input)) return err("That file is not a saved forecast.");
  if (input.format != null && (input.format !== "cayfore.forecast" || input.version !== 1)) {
    return err("That saved forecast format/version is not supported.");
  }
  const candidate = isRecord(input.portfolio) ? input.portfolio : input;
  if (candidate.version !== 1) return err("This forecast version is not supported; expected version 1.");
  const cloud = cloudOf(candidate.cloud);
  if (!cloud || !tierOf(candidate.tier) || !text(candidate.name))
    return err("The forecast needs a name, cloud and tier.");
  if (!listRegions(cloud).some((region) => region.id === candidate.region))
    return err("The saved forecast region is not supported for its cloud.");
  if (!Array.isArray(candidate.workloads) || candidate.workloads.length > 1000)
    return err("The forecast workloads are missing or too numerous.");
  if (candidate.workloads.some((workload) => !validWorkload(workload, cloud)))
    return err("A saved workload has missing or invalid inputs.");
  const ids = candidate.workloads.map((workload: Record<string, unknown>) => workload.id);
  if (new Set(ids).size !== ids.length) return err("Saved workload IDs must be unique.");
  if (
    !isRecord(candidate.commitment) ||
    !finite(candidate.commitment.dbuDiscount, 0, 0.95) ||
    !finite(candidate.commitment.cloudDiscount, 0, 0.95)
  )
    return err("The commitment discounts are invalid.");
  if (
    !oneOf(candidate.addon, ["none", "compliance", "mission_critical"]) ||
    !finite(candidate.usageScale, 0.0001, 1000)
  )
    return err("The saved pricing assumptions are invalid.");
  const settings = candidate.forecast;
  if (candidate.simple != null && !validSimple(candidate.simple))
    return err("The saved quick forecast assumptions are invalid.");
  if (candidate.usage != null && !validUsage(candidate.usage))
    return err("The saved usage history or fitted model is invalid.");
  if (
    !isRecord(settings) ||
    !oneOf(settings.months, [12, 24, 36]) ||
    !finite(settings.annualGrowth, -0.99, 10) ||
    !oneOf(settings.seasonality, ["flat", "retail", "custom"])
  )
    return err("The forecast settings are invalid.");
  if (settings.startMonth != null && !isMonth(settings.startMonth))
    return err("The forecast start month must use YYYY-MM.");
  if (
    settings.seasonality === "custom" &&
    (!Array.isArray(settings.customSeasonality) ||
      settings.customSeasonality.length !== 12 ||
      settings.customSeasonality.some((value) => !finite(value, 0.05, 5)))
  )
    return err("Custom seasonality requires twelve positive factors.");
  if (candidate.budgetAnnual != null && !finite(candidate.budgetAnnual, 0, 1e12))
    return err("The annual budget is invalid.");
  if (
    candidate.priceBook != null &&
    (!isRecord(candidate.priceBook) ||
      !text(candidate.priceBook.version) ||
      !calendarDay(candidate.priceBook.verifiedOn))
  )
    return err("The saved price-book reference is invalid.");
  if (
    candidate.events != null &&
    (!Array.isArray(candidate.events) ||
      candidate.events.some(
        (event) =>
          !isRecord(event) ||
          !text(event.id) ||
          !text(event.name) ||
          !isMonth(event.month) ||
          !finite(event.usageMultiplier, 0, 100) ||
          (event.workloadId != null && !ids.includes(event.workloadId)),
      ))
  )
    return err("A planning event has an invalid month, multiplier or workload.");
  return ok(candidate);
}
