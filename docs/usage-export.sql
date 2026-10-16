-- Columns Cayfore reads. Run in a workspace that can see system tables.
-- Download the result as CSV. list_price is pricing.default, the published list rate.
-- ORIGINAL and RETRACTION rows both belong in the file. RETRACTION quantities are negative.

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
  AND u.usage_unit = 'DBU'
ORDER BY u.usage_date;
