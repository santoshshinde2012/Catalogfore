import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { motion, useReducedMotion } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { stripTransition } from "./strip-motion";

type StripVariant = "segment" | "scroll" | "rail";

const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

/** `useLayoutEffect` warns during prerender. The browser bundle still paints before the next frame. */
const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

const StripContext = createContext<{ layoutId: string; variant: StripVariant; value: string } | null>(null);

const track: Record<StripVariant, string> = {
  segment: "flex w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card",
  scroll:
    "flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto rounded-xl border border-border bg-card [scrollbar-width:thin]",
  rail: "flex w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card",
};

/**
 * A connected single-select strip. Radix supplies roving focus and `aria-checked`.
 * The active segment carries a shared pill and accent bar that slide between choices.
 */
export function SegmentedStrip({
  label,
  value,
  onValueChange,
  variant = "segment",
  disabled,
  className,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  variant?: StripVariant;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const layoutId = useId();
  return (
    <StripContext.Provider value={{ layoutId, variant, value }}>
      <ToggleGroupPrimitive.Root
        type="single"
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
        aria-label={label}
        className={cn(track[variant], disabled && "opacity-60", className)}
        onKeyDown={(event) => selectAfterRovingFocus(event, onValueChange)}
      >
        {children}
      </ToggleGroupPrimitive.Root>
    </StripContext.Provider>
  );
}

/** Radix moves roving focus on a timeout. A radio strip also checks the segment that receives focus. */
function selectAfterRovingFocus(event: KeyboardEvent<HTMLDivElement>, onValueChange: (value: string) => void) {
  if (!ARROW_KEYS.has(event.key)) return;
  const root = event.currentTarget;
  window.setTimeout(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !root.contains(active)) return;
    const next = active.getAttribute("data-value");
    if (next) onValueChange(next);
  }, 0);
}

export function SegmentedStripItem({ value, children }: { value: string; children: ReactNode }) {
  const strip = useContext(StripContext);
  if (!strip) throw new Error("SegmentedStripItem must sit inside SegmentedStrip.");
  const selected = strip.value === value;
  const rail = strip.variant === "rail";
  return (
    <ToggleGroupPrimitive.Item
      value={value}
      data-value={value}
      className={cn(
        "strip-item relative inline-flex min-h-11 items-center justify-center gap-2 border-l border-border px-3 text-sm font-medium text-muted-foreground first:border-l-0 hover:text-foreground data-[state=on]:text-foreground",
        rail
          ? "min-w-0 flex-1 flex-col items-stretch justify-start gap-1 px-2 py-3 text-left sm:px-3"
          : strip.variant === "scroll"
            ? "shrink-0 snap-start whitespace-nowrap"
            : "min-w-0 flex-1",
      )}
    >
      {selected ? <StripIndicator layoutId={strip.layoutId} edge={rail ? "start" : "bottom"} /> : null}
      <span className={cn("relative z-10 flex items-center gap-2", rail && "flex-col items-start gap-1")}>
        {children}
      </span>
    </ToggleGroupPrimitive.Item>
  );
}

export function StripIndicator({ layoutId, edge }: { layoutId: string; edge: "bottom" | "start" }) {
  const reduce = useReducedMotion();
  const transition = stripTransition(reduce);
  return (
    <>
      <motion.span
        layoutId={`${layoutId}-fill`}
        initial={false}
        className={edge === "start" ? "absolute inset-0 bg-lava/10" : "absolute inset-1 rounded-lg bg-lava/10"}
        transition={transition}
        aria-hidden="true"
      />
      <motion.span
        layoutId={`${layoutId}-bar`}
        initial={false}
        className={
          edge === "start"
            ? "absolute inset-y-2 left-0 w-1 rounded-full bg-lava"
            : "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-lava"
        }
        transition={transition}
        aria-hidden="true"
      />
    </>
  );
}

/** Mounts the sliding indicator only while the parent Radix item is selected. */
export function StripPresence({ layoutId, edge }: { layoutId: string; edge: "bottom" | "start" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  useIsoLayoutEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const sync = () => {
      const state = host.getAttribute("data-state");
      setShown(state === "on" || state === "active");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(host, { attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, []);
  return (
    <span ref={ref} className="contents">
      {shown ? <StripIndicator layoutId={layoutId} edge={edge} /> : null}
    </span>
  );
}
