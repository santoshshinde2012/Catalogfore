/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import {
  browserClipboard,
  browserClock,
  browserMotion,
  browserNetwork,
  browserScheduler,
  browserStore,
} from "./browser-ports";

describe("browser ports", () => {
  it("stores, copies, and reads the clock through the ports", async () => {
    browserStore.set("cayfore-test", "1");
    expect(browserStore.get("cayfore-test")).toBe("1");
    browserStore.remove("cayfore-test");
    expect(browserStore.get("cayfore-test")).toBeNull();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText }, onLine: true });
    await browserClipboard.writeText("https://example.test");
    expect(writeText).toHaveBeenCalledWith("https://example.test");
    expect(browserClock.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof browserClock.now()).toBe("number");
    vi.unstubAllGlobals();
  });

  it("reports online changes and cancels idle work", () => {
    let online = false;
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
    const seen: boolean[] = [];
    const stop = browserNetwork.subscribe((value) => seen.push(value));
    online = true;
    window.dispatchEvent(new Event("online"));
    online = false;
    window.dispatchEvent(new Event("offline"));
    stop();
    window.dispatchEvent(new Event("online"));
    expect(seen).toEqual([true, false]);
    expect(browserNetwork.online()).toBe(false);

    const idle = vi.fn();
    vi.stubGlobal("requestIdleCallback", undefined);
    const cancel = browserScheduler.idle(idle, 1800, 5);
    cancel();
    vi.useFakeTimers();
    browserScheduler.later(idle, 5);
    vi.advanceTimersByTime(5);
    expect(idle).toHaveBeenCalledOnce();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("subscribes to reduced motion", () => {
    let reduced = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_name: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_name: string, listener: () => void) => listeners.delete(listener),
    }));
    expect(browserMotion.matches()).toBe(false);
    const seen: boolean[] = [];
    const stop = browserMotion.subscribe((value) => seen.push(value));
    reduced = true;
    listeners.forEach((listener) => listener());
    stop();
    expect(seen).toEqual([true]);
    expect(listeners.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
