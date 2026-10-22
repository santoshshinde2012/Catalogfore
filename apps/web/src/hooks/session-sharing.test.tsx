/** @vitest-environment jsdom */
import * as engine from "@cayfore/engine";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sonnerNotifier } from "../services/sonner-notifier";
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
  history.replaceState(null, "", "/?view=rates");
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function rejectLargeLink() {
  return vi.spyOn(engine, "encodePortfolio").mockImplementation(() => {
    throw new Error("This forecast is too large for a share link. Export JSON to save or share it.");
  });
}

it("keeps an oversized active plan and removes the stale share URL without crashing", () => {
  expect(window.location.hash).toMatch(/^#plan=/);
  const encode = rejectLargeLink();
  act(() => session.setBudget(123456));
  expect(session.portfolio.budgetAnnual).toBe(123456);
  expect(window.location.hash).toBe("");
  expect(window.location.search).toBe("?view=rates");
  expect(session.notice).toContain("Export JSON to save or share it");

  encode.mockRestore();
  act(() => session.setBudget(789));
  expect(window.location.hash).toMatch(/^#plan=/);
  expect(session.notice).toBe("");
  expect(engine.decodePortfolio(window.location.hash.slice("#plan=".length))?.budgetAnnual).toBe(789);
});

it("does not copy or prompt for an oversized share link and offers JSON export", async () => {
  const writeText = vi.fn();
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
  const show = vi.spyOn(sonnerNotifier, "show").mockImplementation(() => {});
  rejectLargeLink();
  const portfolio = session.portfolio;
  await act(async () => session.share());
  expect(writeText).not.toHaveBeenCalled();
  expect(prompt).not.toHaveBeenCalled();
  expect(session.portfolio).toBe(portfolio);
  expect(session.notice).toContain("Export JSON to save or share it");
  expect(show).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: session.notice }));
});

it("still offers a valid link when the clipboard is unavailable", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
  const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
  await act(async () => session.share());
  expect(prompt).toHaveBeenCalledWith("Copy this link", window.location.href);
});
