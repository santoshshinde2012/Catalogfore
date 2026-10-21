import { useLayoutEffect, useState, type RefObject } from "react";

/** Keep a workspace's draft for this app session while its UI is unmounted. */
export function useWorkspaceDraft<T>(cache: RefObject<T | undefined>, initial: () => T) {
  const [draft, setDraft] = useState(() => cache.current ?? initial());
  useLayoutEffect(() => {
    cache.current = draft;
  }, [cache, draft]);
  return [draft, setDraft] as const;
}
