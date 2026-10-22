/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserScheduler } from "../../services/browser-ports";
import { MixBar } from "./plan-widgets";

let root: Root;
let host: HTMLDivElement;
let frames: Map<number, FrameRequestCallback>;
const mix = { etl: 0.5, sql: 0.3, ml: 0.2 };

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  frames = new Map();
  let nextFrame = 0;
  vi.spyOn(browserScheduler, "frame").mockImplementation((callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(browserScheduler, "cancel").mockImplementation((id) => {
    frames.delete(id);
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderBar(onMix = vi.fn(), disabled = false) {
  act(() => root.render(<MixBar mix={mix} disabled={disabled} onMix={onMix} />));
  const bar = host.querySelector("[aria-hidden] > div") as HTMLDivElement;
  vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    right: 100,
    top: 0,
    bottom: 12,
    width: 100,
    height: 12,
    toJSON: () => ({}),
  });
  return bar;
}

function pointer(target: EventTarget, type: string, clientX: number, pointerId = 1) {
  act(() => target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, pointerId, button: 0 })));
}

function paint() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}

describe("mix bar drag lifecycle", () => {
  it("coalesces one pointer's moves and commits its release position using the current handler", () => {
    const original = vi.fn();
    const bar = renderBar(original);
    pointer(bar, "pointerdown", 45);
    pointer(window, "pointermove", 55);
    pointer(window, "pointermove", 95, 2);
    expect(frames.size).toBe(1);
    paint();
    expect(original).toHaveBeenLastCalledWith("etl", 0.55);

    const updated = vi.fn();
    renderBar(updated);
    pointer(window, "pointermove", 60);
    pointer(window, "pointerup", 90, 2);
    expect(updated).not.toHaveBeenCalled();
    pointer(window, "pointerup", 65);
    expect(updated).toHaveBeenCalledExactlyOnceWith("etl", 0.65);
    expect(frames.size).toBe(0);
    pointer(window, "pointermove", 80);
    paint();
    expect(updated).toHaveBeenCalledOnce();
  });

  it.each(["pointercancel", "unmount", "disabled", "blur"] as const)(
    "removes pending work and global listeners after %s",
    (reason) => {
      const onMix = vi.fn();
      const bar = renderBar(onMix);
      pointer(bar, "pointerdown", 45);
      pointer(window, "pointermove", 65);
      if (reason === "pointercancel") pointer(window, "pointercancel", 65);
      if (reason === "unmount") act(() => root.render(null));
      if (reason === "disabled") renderBar(onMix, true);
      if (reason === "blur") act(() => window.dispatchEvent(new Event("blur")));
      expect(frames.size).toBe(0);
      pointer(window, "pointermove", 90);
      pointer(window, "pointerup", 90);
      paint();
      expect(onMix).not.toHaveBeenCalled();
    },
  );
});
