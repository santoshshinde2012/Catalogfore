import { toast } from "sonner";
import type { SessionControls } from "./session-controls";

/** File and sample reads stay off the forecast path until the user asks for them. */
export function usageLoads(controls: SessionControls, preview: (text: string, sourceLabel?: string) => void) {
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
    loadSample: (kind: "current" | "history" = "current") => {
      const request = ++loadRequest.current;
      setUsageBusy(true);
      setUsageProgress(null);
      setUsageError("");
      const sample = kind === "history" ? "sample-usage-history.csv" : "sample-usage.csv";
      void fetch(`${import.meta.env.BASE_URL}${sample}`)
        .then((response) => {
          if (!response.ok) throw new Error("missing");
          return response.text();
        })
        .then((text) => {
          if (request !== loadRequest.current) return;
          preview(
            text,
            kind === "history" ? "Bundled historical demonstration sample" : "Bundled demonstration sample",
          );
          setNotice("Sample data loaded for demonstration. Review the preview before applying.");
          toast.success("Sample ready to review");
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
