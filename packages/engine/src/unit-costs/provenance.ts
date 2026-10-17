import evidence from "../../../../data/unit-cost-evidence.json";
import type { SourceAuthority, UnitCostRow, UnitCostSource } from "./types.js";

interface SourceIdentity {
  authority: SourceAuthority;
  publisher: string;
}

/** Exact hosts and project paths prevent a lookalike URL from gaining first-party authority. */
export function sourceIdentity(value: string): SourceIdentity {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { authority: "unknown", publisher: "Unverified source" };
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443"))
    return { authority: "unknown", publisher: "Unverified source" };
  if (["www.databricks.com", "databricks.com", "docs.databricks.com"].includes(url.hostname))
    return { authority: "first_party", publisher: "Databricks" };
  if (["learn.microsoft.com", "azure.microsoft.com", "prices.azure.com"].includes(url.hostname))
    return { authority: "first_party", publisher: "Microsoft" };
  if (
    [
      "aws.amazon.com",
      "docs.aws.amazon.com",
      "pricing.us-east-1.amazonaws.com",
      "spot-bid-advisor.s3.amazonaws.com",
    ].includes(url.hostname)
  )
    return { authority: "first_party", publisher: "Amazon Web Services" };
  if (["cloud.google.com", "docs.cloud.google.com", "cloudbilling.googleapis.com"].includes(url.hostname))
    return { authority: "first_party", publisher: "Google Cloud" };
  if (["www.flexera.com", "flexera.com"].includes(url.hostname))
    return { authority: "secondary", publisher: "Flexera" };
  if (url.hostname === "community.databricks.com")
    return { authority: "secondary", publisher: "Databricks Community contributors" };
  if (url.hostname === "github.com" && /^\/santoshshinde2012\/cayfore(?:\/|$)/.test(url.pathname))
    return { authority: "project", publisher: "Cayfore" };
  return { authority: "unknown", publisher: url.hostname };
}

/** Reviewing documentation is separate from observing the numeric value stored in the catalog. */
export function sourceReviewedOn(url: string): string | null {
  const exact = evidence.sources.find((reference) => reference.url === url);
  if (exact) return exact.verifiedOn;
  // A filtered meter query is the same reviewed API, with a more precise numeric locator.
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname === "prices.azure.com" &&
      parsed.pathname === "/api/retail/prices"
    )
      return evidence.sources.find((reference) => reference.id === "azure-retail")?.verifiedOn ?? null;
  } catch {
    // Invalid and unregistered sources have no claimed review date.
  }
  return null;
}

export function sourceReference(
  title: string,
  url: string,
  role: UnitCostSource["role"],
  locator?: string,
  observedOn: string | null = null,
): UnitCostSource {
  return {
    title,
    url,
    role,
    ...sourceIdentity(url),
    observedOn,
    reviewedOn: sourceReviewedOn(url),
    ...(locator ? { locator } : {}),
  };
}

/** Authority belongs to the publisher; numeric evidence also needs its role, observation, unit and scope. */
export function withEvidenceLevel(row: UnitCostRow): UnitCostRow {
  const result = (evidenceLevel: UnitCostRow["evidenceLevel"], evidenceSummary: string): UnitCostRow => ({
    ...row,
    evidenceLevel,
    evidenceSummary,
  });
  if (row.status === "not_applicable")
    return result(
      "not_applicable",
      "Platform context has no independent unit quote; connected products can still be billed.",
    );
  if (row.confidence === "conflict")
    return result(
      "unresolved",
      "Published sources disagree on this offering or unit basis; a dollar quote is withheld.",
    );
  if (row.status === "unpriced" || row.confidence === "unpublished")
    return result(
      "unresolved",
      "No trustworthy price or universal usage conversion is stored for this component and scope.",
    );
  if (["assumption", "secondary", "proxy"].includes(row.confidence))
    return result(
      "estimate",
      row.confidence === "secondary"
        ? "A secondary compilation supplies this reference value; official documentation links do not verify it."
        : row.confidence === "proxy"
          ? "A reference price is scaled or reused outside its published scope; this is a planning estimate."
          : "A curated consumption, infrastructure, storage or usage assumption contributes to this value.",
    );
  const firstParty = (reference: UnitCostSource) =>
    reference.authority === "first_party" && sourceIdentity(reference.url).authority === "first_party";
  const officialPrice = row.sources.some(
    (reference) => reference.role === "price" && firstParty(reference) && reference.observedOn !== null,
  );
  const officialConsumption = row.sources.some(
    (reference) =>
      reference.role === "consumption" &&
      firstParty(reference) &&
      reference.reviewedOn !== null &&
      // Azure documentation alone does not establish the same conversion for another cloud.
      (!reference.url.startsWith("https://learn.microsoft.com/en-us/azure/databricks/") ||
        row.cloud === "azure" ||
        row.cloud === null),
  );
  const numericQuote = row.unitPriceUsd !== null && Number.isFinite(row.unitPriceUsd) && row.unitQuantity > 0;
  if (row.confidence === "measured" && row.rateKind === "money" && numericQuote && officialPrice)
    return result(
      "official",
      "A first-party list-price observation matches this billing unit and placement. This is a stored snapshot, not a live quote.",
    );
  if (
    row.confidence === "cited" &&
    officialConsumption &&
    (row.rateKind !== "money" || (numericQuote && officialPrice))
  )
    return result(
      "derived",
      "A published consumption rule is applied to a first-party price or an eligible non-monetary condition. Check units, dates and eligibility.",
    );
  return result(
    "estimate",
    "A stored value is available, but complete first-party numeric evidence for this scope is missing. Review the source dates and assumptions.",
  );
}
