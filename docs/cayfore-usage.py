# Databricks notebook source
# MAGIC %md
# MAGIC # Cayfore usage export
# MAGIC
# MAGIC Run this in a workspace that can read `system.billing`. Download either cell as CSV.
# MAGIC The first cell is the file Advanced → **From a usage file** reads.
# MAGIC The second cell is a per-SKU month you can compare with the forecast.
# MAGIC Estimates only. This notebook does not apply a private contract. Cayfore is not affiliated with Databricks.

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT
# MAGIC   u.sku_name,
# MAGIC   u.cloud,
# MAGIC   u.usage_date,
# MAGIC   u.usage_quantity,
# MAGIC   u.usage_unit,
# MAGIC   u.billing_origin_product,
# MAGIC   u.record_type,
# MAGIC   p.pricing.default AS list_price,
# MAGIC   p.currency_code
# MAGIC FROM system.billing.usage AS u
# MAGIC LEFT JOIN system.billing.list_prices AS p
# MAGIC   ON u.sku_name = p.sku_name
# MAGIC  AND u.cloud = p.cloud
# MAGIC  AND u.usage_unit = p.usage_unit
# MAGIC  AND u.usage_end_time >= p.price_start_time
# MAGIC  AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
# MAGIC WHERE u.usage_date >= add_months(current_date(), -18)
# MAGIC ORDER BY u.usage_date

# COMMAND ----------

# MAGIC %sql
# MAGIC -- Last complete month, dollars, by sku. quantity × published list price.
# MAGIC SELECT
# MAGIC   u.billing_origin_product,
# MAGIC   u.sku_name,
# MAGIC   u.usage_unit,
# MAGIC   SUM(u.usage_quantity) AS quantity,
# MAGIC   SUM(u.usage_quantity * p.pricing.default) AS list_dollars
# MAGIC FROM system.billing.usage AS u
# MAGIC LEFT JOIN system.billing.list_prices AS p
# MAGIC   ON u.sku_name = p.sku_name
# MAGIC  AND u.cloud = p.cloud
# MAGIC  AND u.usage_unit = p.usage_unit
# MAGIC  AND u.usage_end_time >= p.price_start_time
# MAGIC  AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
# MAGIC WHERE u.usage_date >= trunc(add_months(current_date(), -1), 'MM')
# MAGIC   AND u.usage_date < trunc(current_date(), 'MM')
# MAGIC GROUP BY u.billing_origin_product, u.sku_name, u.usage_unit
# MAGIC ORDER BY list_dollars DESC
