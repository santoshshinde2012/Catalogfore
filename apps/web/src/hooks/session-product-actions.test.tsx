/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultInstanceId } from "@cayfore/engine";
import { productById } from "@cayfore/engine/products";
import { buildUnitCostCatalog } from "@cayfore/engine/unit-costs";
import { useSimpleForecast, type SimpleSession } from "./useSimpleForecast";

let root: Root;
let host: HTMLDivElement;
let session: SimpleSession;
function Harness() {
  session = useSimpleForecast();
  return null;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  history.replaceState(null, "", "/");
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("appends every product part, preserves existing planning context, and restores the exact plan on undo", () => {
  act(() => session.setCloud("azure"));
  act(() => session.setGrowth(0.1));
  act(() => session.setBudget(250000));
  act(() => session.setCommit(0.2));
  act(() => session.setCloudDiscount(0.15));
  act(() =>
    session.editPortfolio({
      ...session.portfolio,
      name: "Approved baseline",
      events: [{ id: "growth", name: "Expansion", month: "2027-01", usageMultiplier: 1.2 }],
    }),
  );
  const baseline = structuredClone(session.portfolio);
  let added = false;
  act(() => {
    added = session.addProduct("agent_bricks");
  });
  expect(added).toBe(true);
  const extra = session.portfolio.workloads.slice(baseline.workloads.length);
  expect(extra.map((workload) => workload.partId)).toEqual(productById("agent_bricks")!.parts!.map((part) => part.id));
  expect(session.portfolio.workloads.slice(0, baseline.workloads.length)).toEqual(baseline.workloads);
  expect({ ...session.portfolio, workloads: baseline.workloads }).toEqual(baseline);
  expect(session.selectedId).toBe(extra[0].id);
  expect(session.canUndo).toBe(true);
  act(() => session.undoRemove());
  expect(session.portfolio).toEqual(baseline);
  expect(session.canUndo).toBe(false);
  expect(session.portfolio.workloads.some((workload) => workload.id === session.selectedId)).toBe(true);
});

it("uses the active cloud's machine defaults when adding classic compute", () => {
  act(() => session.setCloud("azure"));
  act(() => session.addProduct("jobs_classic"));
  const added = session.portfolio.workloads.at(-1)!;
  expect(added.kind).toBe("cluster");
  if (added.kind === "cluster") expect(added.instanceId).toBe(defaultInstanceId("azure"));
  expect(session.portfolio.cloud).toBe("azure");
  expect(session.usingDetail).toBe(true);
});

it("preserves a product's supported machine default when adding it on the same cloud", () => {
  act(() => session.addProduct("dlt_pro"));
  expect(session.portfolio.workloads.at(-1)).toMatchObject({ kind: "cluster", instanceId: "i3.xlarge" });
});

it("leaves the plan and share fragment intact for learning-only or unpriced entries", () => {
  const baseline = structuredClone(session.portfolio);
  const hash = location.hash;
  for (const id of ["unity_catalog", "lakehouse_realtime", "unknown"]) {
    let added = true;
    act(() => {
      added = session.addProduct(id);
    });
    expect(added).toBe(false);
    expect(session.portfolio).toEqual(baseline);
    expect(location.hash).toBe(hash);
  }
});

it("preserves the undo snapshot when a calculator quantity is reapplied unchanged", () => {
  const baseline = structuredClone(session.portfolio);
  const row = buildUnitCostCatalog().rows.find(
    (item) =>
      item.productId === "jobs_serverless" &&
      item.cloud === baseline.cloud &&
      item.region === baseline.region &&
      item.tier === baseline.tier &&
      item.unit === "DBU",
  );
  if (!row) throw new Error("Expected a serverless Jobs DBU rate");
  act(() => {
    expect(session.applyUnitCost(row, 240)).toBe(true);
  });
  const applied = structuredClone(session.portfolio);
  act(() => {
    expect(session.applyUnitCost(row, 240)).toBe(false);
  });
  expect(session.portfolio).toEqual(applied);
  expect(session.canUndo).toBe(true);
  act(() => session.undoRemove());
  expect(session.portfolio).toEqual(baseline);
  expect(session.notice).toBe("Previous forecast restored.");
});
