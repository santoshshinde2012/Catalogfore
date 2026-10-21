import { pricesUpdatedOn, regionInfo } from "../catalog.js";
import { coverageAssumption } from "../catalog/sources/coverage-summary.js";
import type { UncertaintyBand } from "../recommend.js";
import type { Cloud, Estimate } from "../types.js";
import { normalizeMix } from "./mix.js";
import type { SimplePlan } from "./project.js";
import { regionFor } from "./shape.js";

/** Sentences for “How we got this”. The wording is part of the page contract. */
export function explain(plan: SimplePlan, result: Estimate, band: UncertaintyBand): string[] {
  const region = regionInfo(plan.cloud, regionFor(plan.cloud, plan.region));
  const mix = normalizeMix(plan.mix);
  const lines = [
    "Pipelines are classic jobs on a standard machine, so part of the bill is the cloud provider. Dashboards are serverless SQL, which has no separate machine charge. Models are token usage priced at the serving rate.",
    `Prices are the public ${plan.tier} list for ${cloudName(plan.cloud)} in ${region.label}.`,
    "Databricks measures usage in DBU. You enter dollars, and this page turns them into that usage with the published rate card.",
  ];
  if (plan.usageDbu) {
    lines.push(
      "The starting point is your usage file. The mix follows the kinds of usage in that file. The file does not list cloud machines, so machine cost is inferred from the pipeline share.",
    );
  } else {
    lines.push(
      `The starting monthly amount is split ${percent(mix.etl)} pipelines, ${percent(mix.sql)} dashboards, and ${percent(mix.ml)} models. Moving the mix keeps that amount and changes what it is made of.`,
    );
  }
  if (plan.commitDiscount > 0) {
    lines.push(
      `The commitment discount of ${percent(plan.commitDiscount)} applies to the Databricks portion only, not to cloud machines.`,
    );
  }
  if (plan.usageForecast) {
    const mape =
      plan.usageForecast.mape == null
        ? ""
        : ` Holding out the last ${plan.usageForecast.holdout} periods, the fit missed by ${mapeText(plan.usageForecast.mape)}.`;
    lines.push(
      `The shaded range combines the usage-model prediction interval from a ${plan.usageForecast.method} fit with separate price and infrastructure planning assumptions. The combined range is not a calibrated probability interval.${mape}`,
    );
  } else if (plan.monthlyGrowth !== 0) {
    lines.push(
      `Each month is ${percent(Math.abs(plan.monthlyGrowth))} ${plan.monthlyGrowth > 0 ? "higher" : "lower"} than the month before.`,
    );
  } else {
    lines.push("Growth is flat, so a year with no discount is about twelve times the first month.");
  }
  if (!plan.usageForecast) {
    if (band.calibrated) {
      lines.push(
        "The shaded range is tighter because it starts from a usage file. It is a planning range, not a prediction interval.",
      );
    } else if (result.lines.some((item) => item.approximateVm)) {
      lines.push("The shaded range runs from about 15% under to 28% over, because a machine rate is a stand-in.");
    } else {
      lines.push(
        "The shaded range runs from about 15% under to 20% over. It is a planning range, not a prediction interval.",
      );
    }
  }
  if (plan.cloud === "azure" && plan.tier === "enterprise") {
    lines.push("Azure publishes one plan, so Enterprise uses the same list as Premium.");
  }
  lines.push(`Prices updated ${pricesUpdatedOn}.`);
  lines.push(coverageAssumption);
  lines.push(
    "Estimates only. A private contract, a promotion, or support charges will differ. The Lakehouse Real-Time promotion is not applied.",
  );
  return lines;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function mapeText(mape: number): string {
  const pct = mape * 100;
  if (pct < 0.1) return "under 0.1%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function cloudName(cloud: Cloud): string {
  if (cloud === "aws") return "AWS";
  if (cloud === "azure") return "Azure";
  return "Google Cloud";
}
