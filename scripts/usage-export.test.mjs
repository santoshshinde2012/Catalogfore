import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the billing query is a fixed SELECT with no interpolated input", async () => {
  const sql = await readFile(new URL("../docs/usage-export.sql", import.meta.url), "utf8");
  const notebook = await readFile(new URL("../docs/cayfore-usage.py", import.meta.url), "utf8");
  for (const source of [sql, notebook]) {
    assert.equal(source.includes("${"), false);
    assert.equal(source.includes("DATABRICKS_TOKEN"), false);
    assert.match(source, /FROM system\.billing\.usage/);
    assert.match(source, /system\.billing\.list_prices/);
    assert.match(source, /add_months\(current_date\(\), -18\)/);
    assert.match(source, /u\.usage_date < date_trunc\('MONTH', current_date\(\)\)/);
    assert.match(source, /p\.pricing\.effective_list\.default AS effective_list_price/);
    assert.match(source, /p\.pricing\.default AS list_price/);
    for (const column of [
      "record_id",
      "ingestion_date",
      "workspace_id",
      "custom_tags",
      "usage_metadata",
      "identity_metadata",
      "product_features",
    ]) {
      assert.match(source, new RegExp(`u\\.${column}`));
    }
  }
  assert.match(sql, /^SELECT/m);
});
