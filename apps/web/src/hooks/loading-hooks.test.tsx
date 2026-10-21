/** @vitest-environment jsdom */
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NetworkStatus } from "../services/ports";
import type { Notifier, Notice } from "../services/notices";
import { useIdlePrefetch } from "./use-idle-prefetch";
import { useOfflineNotice } from "./use-online";
import { useReturnFocus } from "./use-return-focus";
import { useShortcuts } from "./use-shortcuts";
import type { PrefetchPort } from "../services/prefetch-plan";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function network(initial: boolean): NetworkStatus & { set(online: boolean): void } {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  return {
    online: () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      online = next;
      for (const listener of listeners) listener(next);
    },
  };
}

describe("connection hook", () => {
  it("announces a single recovery and stays quiet on the first paint", () => {
    const link = network(false);
    const shown: Notice[] = [];
    const notifier: Notifier = { show: (notice) => shown.push(notice) };
    function Harness() {
      useOfflineNotice(link, notifier);
      return null;
    }
    act(() => root.render(<Harness />));
    expect(shown).toHaveLength(0);
    act(() => link.set(true));
    act(() => link.set(true));
    expect(shown.map((notice) => notice.title)).toEqual(["Back online"]);
    act(() => link.set(false));
    act(() => link.set(true));
    expect(shown).toHaveLength(2);
  });
});

describe("shortcut hook", () => {
  it("runs registry actions and ignores keys fired inside a field", () => {
    const plan = vi.fn();
    function Harness() {
      useShortcuts({ plan });
      return <input aria-label="Spend" />;
    }
    act(() => root.render(<Harness />));
    const input = host.querySelector("input");
    act(() => input?.focus());
    act(() => input?.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true, bubbles: true })));
    expect(plan).not.toHaveBeenCalled();
    act(() => input?.blur());
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true })));
    expect(plan).toHaveBeenCalledOnce();
  });
});

describe("idle prefetch and focus return", () => {
  it("cancels idle prefetch on unmount and restores focus when work finishes", () => {
    const cancel = vi.fn();
    const prefetch: PrefetchPort = {
      warm: vi.fn(),
      warmNavigation: vi.fn(),
      warmIdle: () => cancel,
    };
    let busy = true;
    let mounted = true;
    function Harness() {
      const button = useRef<HTMLButtonElement>(null);
      useIdlePrefetch(prefetch);
      useReturnFocus(busy, button);
      return <button ref={button}>Export</button>;
    }
    function App() {
      return mounted ? <Harness /> : null;
    }
    act(() => root.render(<App />));
    act(() => {
      busy = false;
      root.render(<App />);
    });
    expect(document.activeElement).toBe(host.querySelector("button"));
    act(() => {
      mounted = false;
      root.render(<App />);
    });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
