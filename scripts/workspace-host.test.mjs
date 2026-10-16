import assert from "node:assert/strict";
import test from "node:test";
import { assertWorkspaceHost, readWorkspaceEnv, redactSecrets } from "./workspace-host.mjs";

test("a workspace host is https and a Databricks hostname", () => {
  assert.equal(assertWorkspaceHost("https://dbc-1.cloud.databricks.com/"), "https://dbc-1.cloud.databricks.com");
  assert.equal(assertWorkspaceHost("https://adb-1.azuredatabricks.net"), "https://adb-1.azuredatabricks.net");
  assert.throws(() => assertWorkspaceHost("http://dbc-1.cloud.databricks.com"), /HTTPS/);
  assert.throws(() => assertWorkspaceHost("https://token:dapi@dbc-1.cloud.databricks.com"), /credentials/);
  assert.throws(() => assertWorkspaceHost("https://evil.cloud.databricks.com.attacker.test"), /not a Databricks/);
  assert.throws(() => assertWorkspaceHost("https://169.254.169.254"), /not a Databricks/);
});

test("the token comes from the environment and is redacted in errors", () => {
  const env = {
    DATABRICKS_HOST: "https://dbc-1.cloud.databricks.com",
    DATABRICKS_TOKEN: "dapi0123456789abcdef0123456789ab",
  };
  const read = readWorkspaceEnv(env);
  assert.equal(read.host, "https://dbc-1.cloud.databricks.com");
  assert.equal(read.token, env.DATABRICKS_TOKEN);
  assert.equal(read.timeoutMs, 30_000);
  assert.equal(redactSecrets(`failed ${env.DATABRICKS_TOKEN}`).includes(env.DATABRICKS_TOKEN), false);
  assert.throws(() => readWorkspaceEnv({}), /required/);
});
