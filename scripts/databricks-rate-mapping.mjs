/** Exact calculator labels only: token, capacity-unit, SAP and Gov variants need separate units. */
export const DATABRICKS_SOURCES = [
  {
    id: "databricks-calculator-aws",
    cloud: "aws",
    label: "AWS",
    url: "https://www.databricks.com/en-pricing-assets/data/pricing/AWS.json",
  },
  {
    id: "databricks-calculator-gcp",
    cloud: "gcp",
    label: "GCP",
    url: "https://www.databricks.com/en-pricing-assets/data/pricing/GCP.json",
  },
  {
    id: "databricks-price-cards",
    cloud: "multi",
    label: "Price cards",
    url: "https://www.databricks.com/en-pricing-assets/data/pricing/cards.json",
  },
];

/** Units verified on the corresponding rendered official product price pages. */
export const CARD_SKUS = new Map([
  ["jobs_compute_/_jobs_compute_photon", "jobs_classic"],
  ["all_purpose_/_all_purpose_photon", "all_purpose_classic"],
  ["dlt_core", "dlt_core"],
  ["dlt_pro", "dlt_pro"],
  ["dlt_advanced", "dlt_advanced"],
  ["dlt_serverless", "dlt_serverless"],
  ["sql_classic", "sql_classic"],
  ["sql_pro", "sql_pro"],
  ["sql_serverless", "sql_serverless"],
  ["jobs_serverless", "jobs_serverless"],
  ["interactive_serverless", "all_purpose_serverless"],
  ["compute_for_apps", "apps"],
  ["lakeflow_connect", "lakeflow_connect"],
  ["predictive_optimization", "managed_services"],
  ["lakehouse_monitoring", "managed_services"],
  ["serverless_real-time_inference", "model_serving"],
  ["model_training_-_forecasting", "model_training"],
  ["foundation_model_training", "model_training"],
]);

export const COMPUTE_SKUS = new Map([
  ["Jobs Compute", "jobs_classic"],
  ["All-Purpose Compute", "all_purpose_classic"],
  ["DLT Core Compute", "dlt_core"],
  ["DLT Pro Compute", "dlt_pro"],
  ["DLT Advanced Compute", "dlt_advanced"],
  ["SQL Compute", "sql_classic"],
  ["SQL Pro Compute", "sql_pro"],
  ["SQL Serverless Compute", "sql_serverless"],
  ["Jobs Serverless Compute", "jobs_serverless"],
  ["DLT Serverless Compute", "dlt_serverless"],
  ["Interactive Serverless Compute", "all_purpose_serverless"],
  ["Model Serving/Serverless Real-Time Inference", "model_serving"],
  ["Serverless Real-Time Inference", "model_serving"],
]);

const AWS_REGIONS = {
  "US East (N. Virginia)": "us-east-1",
  "US East (Ohio)": "us-east-2",
  "US West (Oregon)": "us-west-2",
  "US West (N. California)": "us-west-1",
  "US West (California)": "us-west-1",
  Canada: "ca-central-1",
  "Europe (Ireland)": "eu-west-1",
  "Europe (London)": "eu-west-2",
  "Europe (France)": "eu-west-3",
  "Europe (Frankfurt)": "eu-central-1",
  "Europe (Stockholm)": "eu-north-1",
  "Europe (Zurich)": "eu-central-2",
  "AP (Mumbai)": "ap-south-1",
  "AP (Tokyo)": "ap-northeast-1",
  "AP (Seoul)": "ap-northeast-2",
  "AP (Singapore)": "ap-southeast-1",
  "AP (Sydney)": "ap-southeast-2",
  "AP (Jakarta)": "ap-southeast-3",
  "SA (Brazil)": "sa-east-1",
};
const GCP_REGIONS = {
  "US (Iowa)": "us-central1",
  "US-Central (Iowa)": "us-central1",
  "US (South Carolina)": "us-east1",
  "US-East (South Carolina)": "us-east1",
  "US (Virginia)": "us-east4",
  "US-East (Virginia)": "us-east4",
  "US (Oregon)": "us-west1",
  "US-West (Oregon)": "us-west1",
  "US (Nevada)": "us-west4",
  "USA (Nevada)": "us-west4",
  "US-West (Nevada)": "us-west4",
  "Canada (Quebec)": "northamerica-northeast1",
  "Europe (Belgium)": "europe-west1",
  "Europe-West (Belgium)": "europe-west1",
  "Europe (England)": "europe-west2",
  "Europe-West (England)": "europe-west2",
  "Europe (Frankfurt)": "europe-west3",
  "Europe-West (Frankfurt)": "europe-west3",
  "Asia (Tokyo)": "asia-northeast1",
  "Asia-Northeast (Tokyo)": "asia-northeast1",
  "Asia (Singapore)": "asia-southeast1",
  "Asia-Southeast (Singapore)": "asia-southeast1",
  "India (Mumbai)": "asia-south1",
  "Asia (Mumbai)": "asia-south1",
  "Australia (Sydney)": "australia-southeast1",
  "Australia-Southeast (Sydney)": "australia-southeast1",
  "ME (Dammam)": "me-central2",
  "SA (Brazil)": "southamerica-east1",
};

export function calculatorRegion(cloud, label) {
  if (label === null || label === undefined || label === "n/a") return null;
  return (cloud === "aws" ? AWS_REGIONS : GCP_REGIONS)[label];
}

export function knownCalculatorRegions(cloud) {
  return new Set(Object.values(cloud === "aws" ? AWS_REGIONS : GCP_REGIONS));
}

export function exclusionReason(compute) {
  if (typeof compute !== "string") return "missing-compute-label";
  if (/ - (?:SAP|Gov)$/.test(compute)) return "separate-SAP-or-government-offering";
  if (compute.includes("Photon")) return "separate-Photon-consumption-not-an-additional-DBU-price";
  if (compute === "Lakebase") return "capacity-unit-and-edition-conversion-requires-separate-model";
  if (compute.startsWith("FM API") || compute.startsWith("Fine Tuning"))
    return "model-or-token-units-not-generic-DBU-baserate";
  return "compute-not-mapped-to-curated-SKU";
}
