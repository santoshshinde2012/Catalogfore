-- Columns Cayfore reads. Run in a workspace that can see system tables.
-- Least privilege: USE CATALOG system; USE SCHEMA billing; SELECT on usage and list_prices.
-- This text is fixed. The CLI prints it. It does not concatenate a workspace, a token, or a filter.
-- A personal access token stays in the environment of the Databricks CLI or the SQL editor. Cayfore does not read it.
-- Download the result as CSV and use Advanced → From a usage file.
-- list_price is pricing.default. effective_list_price resolves public promotions and is the default import basis.
-- ORIGINAL and RETRACTION rows both belong in the file. RETRACTION quantities are negative.
-- Every usage unit is included. DBU, GB, token, and day rows map to a product when the sku name is known.
-- Exported effective-list costs do not include a private contract. Missing prices remain visible in Cayfore.
-- Only closed calendar months are exported so an unfinished month cannot depress the forecast.
-- Workspace, tags, and identity/resource metadata stay in the browser for local attribution.

SELECT
  u.sku_name,
  u.cloud,
  u.usage_date,
  u.usage_quantity,
  u.usage_unit,
  u.billing_origin_product,
  u.record_type,
  u.record_id,
  u.ingestion_date,
  u.workspace_id,
  u.custom_tags,
  u.usage_metadata,
  u.identity_metadata,
  u.product_features,
  p.pricing.default AS list_price,
  p.pricing.effective_list.default AS effective_list_price,
  CASE WHEN p.pricing.effective_list.default IS NOT NULL THEN 'effective-list' ELSE 'list' END AS price_basis,
  p.currency_code
FROM system.billing.usage AS u
LEFT JOIN system.billing.list_prices AS p
  ON u.sku_name = p.sku_name
 AND u.cloud = p.cloud
 AND u.usage_unit = p.usage_unit
 AND u.usage_end_time >= p.price_start_time
 AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
WHERE u.usage_date >= add_months(current_date(), -18)
  AND u.usage_date < date_trunc('MONTH', current_date())
ORDER BY u.usage_date;
