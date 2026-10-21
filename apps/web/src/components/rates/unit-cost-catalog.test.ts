import { describe, expect, it } from "vitest";
import { createUnitCostLoader } from "./unit-cost-catalog";

describe("unit-cost catalog loader", () => {
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
