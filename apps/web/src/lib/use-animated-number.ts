import { useEffect, useRef, useState } from "react";
import { browserClock, browserMotion } from "../services/browser-ports";

const COUNTER_MS = 480;

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const apply = () => setReduce(browserMotion.matches());
    apply();
    return browserMotion.subscribe(setReduce);
  }, []);
  return reduce;
}

export function useAnimatedNumber(value: number) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const reduce = browserMotion.matches();
    const start = from.current;
    if (reduce || start === value) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const began = browserClock.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / COUNTER_MS);
      const eased = 1 - (1 - t) ** 3;
      const next = start + (value - start) * eased;
      from.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display;
}
