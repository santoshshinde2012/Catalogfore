/**
 * Maps system.billing.usage sku_name (and, if the name is unknown, billing_origin_product)
 * onto a catalog product and an engine SKU. More specific patterns come first.
 * engineSku "other" means the row is kept for the product forecast but is not one of the simple-page groups.
 */

export interface BillingMatch {
  engineSku: string;
  productId: string | null;
}

interface Rule {
  pattern: RegExp;
  engineSku: string;
  productId: string;
}

const SKU_RULES: Rule[] = [
  {
    pattern: /SERVERLESS_REAL_TIME_INFERENCE_LAUNCH|INFERENCE_LAUNCH/i,
    engineSku: "model_serving",
    productId: "serving_launch_charge",
  },
  { pattern: /JOBS_LIGHT/i, engineSku: "jobs_classic", productId: "jobs_light" },
  { pattern: /JOBS_SERVERLESS|SERVERLESS_JOBS/i, engineSku: "jobs_serverless", productId: "jobs_serverless" },
  {
    pattern: /ALL_PURPOSE_SERVERLESS|SERVERLESS_ALL_PURPOSE|NOTEBOOK_SERVERLESS|INTERACTIVE_SERVERLESS/i,
    engineSku: "all_purpose_serverless",
    productId: "all_purpose_serverless",
  },
  {
    pattern: /DLT_SERVERLESS|SERVERLESS_DLT|PIPELINES_SERVERLESS/i,
    engineSku: "dlt_serverless",
    productId: "dlt_serverless",
  },
  { pattern: /PREDICTIVE_OPTIMIZATION/i, engineSku: "managed_services", productId: "predictive_optimization" },
  { pattern: /DATA_QUALITY|LAKEHOUSE_MONITORING/i, engineSku: "jobs_serverless", productId: "data_quality" },
  { pattern: /DATA_CLASSIFICATION/i, engineSku: "jobs_serverless", productId: "data_classification" },
  { pattern: /JOBS_COMPUTE/i, engineSku: "jobs_classic", productId: "jobs_classic" },
  { pattern: /ALL_PURPOSE/i, engineSku: "all_purpose_classic", productId: "all_purpose_classic" },
  { pattern: /DLT_ADVANCED|PIPELINE_ADVANCED/i, engineSku: "dlt_advanced", productId: "dlt_advanced" },
  { pattern: /DLT_PRO|PIPELINE_PRO/i, engineSku: "dlt_pro", productId: "dlt_pro" },
  { pattern: /DLT_CORE|PIPELINE_CORE|DLT_COMPUTE/i, engineSku: "dlt_core", productId: "dlt_core" },
  { pattern: /LAKEFLOW_CONNECT/i, engineSku: "lakeflow_connect", productId: "lakeflow_connect" },
  { pattern: /SERVERLESS_SQL|SQL_SERVERLESS/i, engineSku: "sql_serverless", productId: "sql_serverless" },
  { pattern: /SQL_PRO/i, engineSku: "sql_pro", productId: "sql_pro" },
  { pattern: /SQL/i, engineSku: "sql_classic", productId: "sql_classic" },
  { pattern: /FOUNDATION_MODEL_TRAINING|MODEL_TRAINING/i, engineSku: "model_training", productId: "model_training" },
  { pattern: /VECTOR_SEARCH|AI_SEARCH/i, engineSku: "ai_search", productId: "vector_search_standard" },
  { pattern: /AGENT_BRICKS|SUPERVISOR_AGENT/i, engineSku: "model_serving", productId: "agent_bricks" },
  { pattern: /AGENT_EVALUATION/i, engineSku: "model_serving", productId: "agent_evaluation" },
  { pattern: /AI_PARSE_DOCUMENT|AI_PARSE/i, engineSku: "model_serving", productId: "ai_parse_document" },
  { pattern: /AI_QUERY|AI_FUNCTIONS/i, engineSku: "model_serving", productId: "ai_query" },
  { pattern: /AI_GATEWAY/i, engineSku: "model_serving", productId: "ai_gateway_tracking" },
  { pattern: /ONLINE_TABLES/i, engineSku: "model_serving", productId: "online_tables" },
  {
    pattern: /FEATURE_STORE|FEATURE_SERVING|SERVING_TYPE_FEATURE/i,
    engineSku: "model_serving",
    productId: "feature_serving",
  },
  { pattern: /AI_RUNTIME|SERVERLESS_GPU/i, engineSku: "model_serving", productId: "serverless_gpu" },
  { pattern: /GENIE/i, engineSku: "model_serving", productId: "genie" },
  { pattern: /CLEAN_ROOM/i, engineSku: "managed_services", productId: "clean_rooms" },
  { pattern: /APPS/i, engineSku: "apps", productId: "databricks_apps" },
  { pattern: /LAKEBASE|DATABASE_SERVERLESS|DATABASE/i, engineSku: "managed_services", productId: "lakebase" },
  { pattern: /ZEROBUS/i, engineSku: "managed_services", productId: "zerobus" },
  { pattern: /DATA_SHARING|OPEN_SHARING|DELTA_SHARING/i, engineSku: "managed_services", productId: "delta_sharing" },
  {
    pattern: /PRIVATE_LINK|PRIVATE_CONNECTIVITY|NAT_GATEWAY/i,
    engineSku: "managed_services",
    productId: "private_link",
  },
  { pattern: /NETWORKING|DATA_TRANSFER|DATA_PROCESSED/i, engineSku: "managed_services", productId: "data_processed" },
  {
    pattern: /DEFAULT_STORAGE|DATABRICKS_STORAGE|STORAGE/i,
    engineSku: "managed_services",
    productId: "managed_storage",
  },
  { pattern: /INFERENCE|MODEL_SERVING|FOUNDATION/i, engineSku: "model_serving", productId: "model_serving_cpu" },
];

const ORIGIN_RULES: Rule[] = [
  { pattern: /^AGENT_BRICKS$|^SUPERVISOR_AGENT$/i, engineSku: "model_serving", productId: "agent_bricks" },
  { pattern: /^AGENT_EVALUATION$/i, engineSku: "model_serving", productId: "agent_evaluation" },
  { pattern: /^AI_FUNCTIONS$/i, engineSku: "model_serving", productId: "ai_parse_document" },
  { pattern: /^AI_GATEWAY$/i, engineSku: "model_serving", productId: "ai_gateway_tracking" },
  { pattern: /^GENIE$/i, engineSku: "model_serving", productId: "genie" },
  { pattern: /^ONLINE_TABLES$/i, engineSku: "model_serving", productId: "online_tables" },
  { pattern: /^FEATURE_STORE$/i, engineSku: "model_serving", productId: "feature_serving" },
  { pattern: /^AI_RUNTIME$/i, engineSku: "model_serving", productId: "serverless_gpu" },
  { pattern: /^VECTOR_SEARCH$/i, engineSku: "ai_search", productId: "vector_search_standard" },
  { pattern: /^LAKEFLOW_CONNECT$/i, engineSku: "lakeflow_connect", productId: "lakeflow_connect" },
  { pattern: /^CLEAN_ROOM$/i, engineSku: "managed_services", productId: "clean_rooms" },
  { pattern: /^APPS$/i, engineSku: "apps", productId: "databricks_apps" },
  { pattern: /^LAKEBASE$|^DATABASE$/i, engineSku: "managed_services", productId: "lakebase" },
  { pattern: /^DATA_SHARING$/i, engineSku: "managed_services", productId: "delta_sharing" },
  { pattern: /^NETWORKING$/i, engineSku: "managed_services", productId: "data_processed" },
  { pattern: /^DEFAULT_STORAGE$/i, engineSku: "managed_services", productId: "managed_storage" },
  { pattern: /^FOUNDATION_MODEL_TRAINING$/i, engineSku: "model_training", productId: "model_training" },
  { pattern: /^MODEL_SERVING$/i, engineSku: "model_serving", productId: "model_serving_cpu" },
  { pattern: /^SQL$/i, engineSku: "sql_serverless", productId: "sql_serverless" },
  { pattern: /^JOBS$/i, engineSku: "jobs_classic", productId: "jobs_classic" },
  { pattern: /^DLT$/i, engineSku: "dlt_pro", productId: "dlt_pro" },
  { pattern: /^ALL_PURPOSE$/i, engineSku: "all_purpose_classic", productId: "all_purpose_classic" },
];

export function matchBilling(skuName: string, billingOrigin = ""): BillingMatch {
  const named = SKU_RULES.find((rule) => rule.pattern.test(skuName));
  if (named) return { engineSku: named.engineSku, productId: named.productId };
  const origin = ORIGIN_RULES.find((rule) => rule.pattern.test(billingOrigin.trim()));
  if (origin) return { engineSku: origin.engineSku, productId: origin.productId };
  return { engineSku: "other", productId: null };
}
