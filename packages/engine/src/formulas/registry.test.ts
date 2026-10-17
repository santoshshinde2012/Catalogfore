import { FORMULAS } from "@cayfore/catalog";
import { describe, expect, it } from "vitest";
import type { Workload } from "../types.js";
import { formulaRegistry } from "./registry.js";

const blank: Extract<Workload, { kind: "metered" }> = {
  id: "formula",
  name: "Formula",
  kind: "metered",
  sku: "managed_services",
  dbuPerMonth: 0,
  inputs: {},
};

describe("formula registry", () => {
  it("has one function for every catalog formula", () => {
    expect(Object.keys(formulaRegistry).sort()).toEqual([...FORMULAS].sort());
  });

  it.each(FORMULAS)("%s returns a metered workload and does not mutate the input", (id) => {
    const next = formulaRegistry[id](blank);
    expect(next.kind).toBe("metered");
    expect(blank.dbuPerMonth).toBe(0);
    expect(blank.inputs).toEqual({});
    if (next.kind === "metered") expect(Number.isFinite(next.dbuPerMonth)).toBe(true);
  });
});
