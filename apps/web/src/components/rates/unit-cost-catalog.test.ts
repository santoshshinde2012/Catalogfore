import * as unitCosts from "@cayfore/engine/unit-costs";
import { describe, expect, it, vi } from "vitest";
import { createUnitCostLoader } from "./unit-cost-catalog";

describe("unit-cost catalog loader", () => {
  it("rejects a failed scheduled build so the workspace can show recovery controls", async () => {
    const queue: Array<() => void> = [];
    const build = vi.spyOn(unitCosts, "buildUnitCostCatalog").mockImplementationOnce(() => {
      throw new Error("Catalog build failed");
    });
    const load = createUnitCostLoader({
      frame: (task) => {
        queue.push(task);
        return queue.length;
      },
      later: (task) => {
        queue.push(task);
        return queue.length;
      },
    });
    try {
      const pending = load();
      const rejected = expect(pending).rejects.toThrow("Catalog build failed");
      await vi.waitFor(() => expect(queue.length).toBeGreaterThan(0));
      expect(() => {
        while (queue.length) queue.shift()?.();
      }).not.toThrow();
      await rejected;
    } finally {
      build.mockRestore();
    }
  });

  it("lets the skeleton paint before the synchronous build", async () => {
    const queue: Array<() => void> = [];
    const load = createUnitCostLoader({
      frame: (task) => {
        queue.push(task);
        return queue.length;
      },
      later: (task) => {
        queue.push(task);
        return queue.length;
      },
    });
    let settled = false;
    const pending = load().then((catalog) => {
      settled = true;
      return catalog;
    });
    let deferred = false;
    const deadline = Date.now() + 15_000;
    while (!settled && Date.now() < deadline) {
      const task = queue.shift();
      if (!task) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (queue.length > 0) deferred = true;
        continue;
      }
      task();
    }
    const catalog = await pending;
    expect(deferred).toBe(true);
    expect(catalog.rows.length).toBeGreaterThan(0);
    await expect(load()).resolves.toBe(catalog);
  }, 20_000);
});
