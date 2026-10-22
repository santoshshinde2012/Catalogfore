/** @vitest-environment jsdom */
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { NetworkStatus } from "../services/ports";
import { useOfflineNotice } from "./use-online";

afterEach(() => vi.unstubAllGlobals());

it.each([true, false])(
  "hydrates the prerender before reading browser connection state (online: %s)",
  async (online) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const readOnline = vi.fn(() => online);
    let notify: ((online: boolean) => void) | undefined;
    const unsubscribe = vi.fn();
    const network: NetworkStatus = {
      online: readOnline,
      subscribe(listener) {
        notify = listener;
        return unsubscribe;
      },
    };
    const notifier = { show: vi.fn() };
    function Status() {
      const offline = useOfflineNotice(network, notifier);
      return <p>{offline ? "Offline" : "Online"}</p>;
    }
    const host = document.createElement("div");
    host.innerHTML = renderToString(<Status />);
    expect(host.textContent).toBe("Online");
    expect(readOnline).not.toHaveBeenCalled();
    document.body.append(host);
    const onRecoverableError = vi.fn();
    const root = hydrateRoot(host, <Status />, { onRecoverableError });
    try {
      await act(async () => {});
      expect(host.textContent).toBe(online ? "Online" : "Offline");
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(notifier.show).not.toHaveBeenCalled();
      readOnline.mockReturnValue(true);
      act(() => notify?.(true));
      expect(host.textContent).toBe("Online");
      expect(notifier.show).toHaveBeenCalledTimes(online ? 0 : 1);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
    expect(unsubscribe).toHaveBeenCalledOnce();
  },
);
