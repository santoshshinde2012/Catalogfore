import { browserFetcher } from "../services/browser-ports";
import { notices, type Notifier } from "../services/notices";
import type { TextFetcher } from "../services/ports";
import { showNotice, sonnerNotifier } from "../services/sonner-notifier";
import { usageSamples, type UsageSampleKind } from "../services/usage-samples";
import type { SessionControls } from "./session-controls";

/** File and sample reads stay off the forecast path until the user asks for them. */
export function usageLoads(
  controls: SessionControls,
  preview: (text: string, sourceLabel?: string) => boolean,
  ports: { fetcher?: TextFetcher; notifier?: Notifier } = {},
) {
  const fetcher = ports.fetcher ?? browserFetcher;
  const notifier = ports.notifier ?? sonnerNotifier;
  const { loadRequest, setUsageBusy, setUsageProgress, setUsageError, setNotice } = controls;
  return {
    loadUsageFile: (file: File) => {
      const request = ++loadRequest.current;
      setUsageBusy(true);
      setUsageProgress(0);
      setUsageError("");
      void import("../security/read-with-progress")
        .then(({ readUsageWithProgress }) =>
          readUsageWithProgress(file, (ratio) => {
            if (request === loadRequest.current) setUsageProgress(Math.round(ratio * 100));
          }),
        )
        .then((result) => {
          if (request !== loadRequest.current) return;
          if (result.ok) preview(result.value);
          else setUsageError(result.error);
        })
        .catch(() => {
          if (request === loadRequest.current) setUsageError("That file could not be read.");
        })
        .finally(() => {
          if (request === loadRequest.current) {
            setUsageBusy(false);
            setUsageProgress(null);
          }
        });
    },
    loadSample: (kind: UsageSampleKind = "current") => {
      const request = ++loadRequest.current;
      setUsageBusy(true);
      setUsageProgress(null);
      setUsageError("");
      const sample = usageSamples[kind];
      void fetcher
        .getText(`${import.meta.env.BASE_URL}${sample.href}`)
        .then((text) => {
          if (request !== loadRequest.current) return;
          if (!preview(text, sample.source)) return;
          setNotice("Sample data loaded for demonstration. Review the preview before applying.");
          showNotice(notices.sampleReady(), notifier);
        })
        .catch(() => {
          if (request === loadRequest.current) setUsageError("The sample file did not load.");
        })
        .finally(() => {
          if (request === loadRequest.current) {
            setUsageBusy(false);
            setUsageProgress(null);
          }
        });
    },
  };
}
