import {
  encodePortfolio,
  normalizePortfolio,
  portfolioFromUsage,
  previewUsageImport,
  type Portfolio,
  type UsageImportPreview,
} from "@cayfore/engine";
import { toast } from "sonner";
import { planFromPortfolio } from "./forecast-session";
import type { SessionControls } from "./session-controls";

export function ioActions(controls: SessionControls) {
  const {
    portfolio,
    setPlan,
    setOverride,
    setUndo,
    setSelectedId,
    setUsageError,
    setUsageBusy,
    setUsagePreview,
    setNotice,
  } = controls;
  function loadPortfolio(input: Portfolio) {
    const next = normalizePortfolio(input);
    const simple = planFromPortfolio(next);
    if (simple) setPlan(simple);
    else
      setPlan((current) => ({
        ...current,
        cloud: next.cloud,
        tier: next.tier,
        region: next.region,
        commitDiscount: next.commitment.dbuDiscount,
        monthlyGrowth: Math.pow(1 + next.forecast.annualGrowth, 1 / 12) - 1,
      }));
    setUndo(portfolio);
    setOverride(next);
    setSelectedId(next.workloads[0]?.id ?? null);
  }
  function loadUsageText(text: string, sourceLabel?: string) {
    try {
      const preview = {
        ...previewUsageImport(text, { asOf: new Date().toISOString().slice(0, 10) }),
        ...(sourceLabel ? { sourceLabel } : {}),
      };
      if (!preview.records.length) {
        setUsageError(preview.warnings[0] ?? "That file did not contain usage rows.");
        return;
      }
      setUsageError("");
      setUsagePreview(preview);
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "That usage file could not be read.");
    }
  }
  return {
    loadPortfolio,
    loadUsageText,
    loadUsagePreview: (preview: UsageImportPreview, mode: "replace" | "append") => {
      try {
        const loaded = portfolioFromUsage(preview, { base: portfolio, mode });
        loadPortfolio(loaded.portfolio);
        setUsagePreview(null);
        setUsageError("");
        setNotice(
          mode === "replace"
            ? "Replaced the baseline with imported usage."
            : "Appended imported usage. Review combined scope for overlap.",
        );
      } catch (error) {
        setUsageError(error instanceof Error ? error.message : "That usage could not be imported.");
      }
    },
    dismissUsagePreview: () => setUsagePreview(null),
    loadUsageFile: (file: File) => {
      setUsageBusy(true);
      void import("../security/read-upload")
        .then(({ readUsageFile }) => readUsageFile(file))
        .then((result) => {
          if (result.ok) loadUsageText(result.value);
          else setUsageError(result.error);
        })
        .catch(() => setUsageError("That file could not be read."))
        .finally(() => setUsageBusy(false));
    },
    loadSample: (kind: "current" | "history" = "current") => {
      setUsageBusy(true);
      setUsageError("");
      void fetch(`${import.meta.env.BASE_URL}${kind === "history" ? "sample-usage-history.csv" : "sample-usage.csv"}`)
        .then((response) => {
          if (!response.ok) throw new Error("missing");
          return response.text();
        })
        .then((text) => {
          loadUsageText(
            text,
            kind === "history" ? "Bundled historical demonstration sample" : "Bundled demonstration sample",
          );
          setNotice("Sample data loaded for demonstration. Review the preview before applying.");
        })
        .catch(() => setUsageError("The sample file did not load."))
        .finally(() => setUsageBusy(false));
    },
    share: async () => {
      const url = new URL(window.location.href);
      url.hash = `plan=${encodePortfolio(portfolio)}`;
      try {
        await navigator.clipboard.writeText(url.href);
        setNotice("Link copied");
        toast.success("Link copied");
      } catch {
        window.prompt("Copy this link", url.href);
      }
    },
    loadForecastFile: (file: File) => {
      return import("../security/read-upload")
        .then(({ readForecastFile }) => readForecastFile(file))
        .then((result) => {
          if (result.ok) loadPortfolio(result.value);
          else {
            setNotice(result.error);
            toast.error(result.error);
          }
        })
        .catch(() => {
          const error = "That file is not a forecast JSON.";
          setNotice(error);
          toast.error(error);
        });
    },
  };
}
