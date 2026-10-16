-- Columns Cayfore reads. Run in a workspace that can see system tables.
-- Download the result as CSV and use Advanced → From a usage file.
-- list_price is pricing.default, the published list rate.
-- ORIGINAL and RETRACTION rows both belong in the file. RETRACTION quantities are negative.
-- Every usage unit is included. DBU, GB, token, and day rows map to a product when the sku name is known.
-- A row with list_price is forecast at quantity × that price. A DBU row without a price uses the bundled rate card.

SELECT
  u.sku_name,
  u.cloud,
  u.usage_date,
  u.usage_quantity,
  u.usage_unit,
  u.billing_origin_product,
  u.record_type,
  p.pricing.default AS list_price,
  p.currency_code
FROM system.billing.usage AS u
LEFT JOIN system.billing.list_prices AS p
  ON u.sku_name = p.sku_name
 AND u.cloud = p.cloud
 AND u.usage_unit = p.usage_unit
 AND u.usage_end_time >= p.price_start_time
 AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
WHERE u.usage_date >= add_months(current_date(), -18)
ORDER BY u.usage_date;
