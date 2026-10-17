import assert from "node:assert/strict";
import test from "node:test";
import { takeOption } from "./cli-args.mjs";

test("takeOption removes the flag and its value and leaves the file path", () => {
  assert.deepEqual(takeOption(["plan.json", "--xlsx", "out.xlsx"], "--xlsx"), {
    value: "out.xlsx",
    rest: ["plan.json"],
  });
  assert.deepEqual(takeOption(["--xlsx", "out.xlsx", "plan.json"], "--xlsx"), {
    value: "out.xlsx",
    rest: ["plan.json"],
  });
});

test("a missing flag leaves the arguments alone", () => {
  assert.deepEqual(takeOption(["plan.json"], "--xlsx"), { value: undefined, rest: ["plan.json"] });
});

test("a flag without a value is rejected", () => {
  assert.throws(() => takeOption(["--xlsx"], "--xlsx"), /--xlsx needs a value/);
  assert.throws(() => takeOption(["--xlsx", "--cloud"], "--xlsx"), /--xlsx needs a value/);
});
