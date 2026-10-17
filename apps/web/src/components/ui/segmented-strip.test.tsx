/** @vitest-environment jsdom */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SegmentedStrip, SegmentedStripItem } from "./segmented-strip";
import { stripTransition } from "./strip-motion";

describe("strip motion", () => {
  it("snaps when the user prefers reduced motion and springs otherwise", () => {
    expect(stripTransition(true)).toEqual({ duration: 0 });
    expect(stripTransition(false)).toMatchObject({ type: "spring" });
  });
});

describe("SegmentedStrip", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
  });

  it("exposes a radiogroup, keeps the selection, and moves with the keyboard", async () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root?.render(<Harness />);
    });
    const group = host.querySelector("[role='radiogroup']");
    expect(group?.getAttribute("aria-label")).toBe("Cloud");
    const radios = [...host.querySelectorAll<HTMLButtonElement>("[role='radio']")];
    expect(radios.map((radio) => radio.textContent)).toEqual(["AWS", "Azure"]);
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    act(() => {
      radios[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(radios[1]?.getAttribute("aria-checked")).toBe("true");
    expect(radios[0]?.getAttribute("aria-checked")).toBe("false");
    act(() => {
      radios[1]?.focus();
      radios[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radios[0]);
    act(() => {
      radios[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
  });
});

function Harness() {
  const [value, setValue] = useState("aws");
  return (
    <SegmentedStrip label="Cloud" value={value} onValueChange={setValue}>
      <SegmentedStripItem value="aws">AWS</SegmentedStripItem>
      <SegmentedStripItem value="azure">Azure</SegmentedStripItem>
    </SegmentedStrip>
  );
}
