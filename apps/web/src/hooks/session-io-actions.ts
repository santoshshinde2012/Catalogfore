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
    loadRequest,
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
    loadRequest.current += 1;
    setUsageBusy(false);
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
    setUsageError("");
    setUsagePreview(null);
    setNotice("");
  }
  function previewUsageText(text: string, sourceLabel?: string) {
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
  function loadUsageText(text: string, sourceLabel?: string) {
    loadRequest.current += 1;
    setUsageBusy(false);
    previewUsageText(text, sourceLabel);
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
    dismissUsagePreview: () => {
      loadRequest.current += 1;
      setUsageBusy(false);
      setUsagePreview(null);
      setUsageError("");
      setNotice("Import cancelled. Your forecast is unchanged.");
    },
    loadUsageFile: (file: File) => {
      const request = ++loadRequest.current;
      setUsageBusy(true);
      setUsageError("");
      void import("../security/read-upload")
        .then(({ readUsageFile }) => readUsageFile(file))
        .then((result) => {
          if (request !== loadRequest.current) return;
          if (result.ok) previewUsageText(result.value);
          else setUsageError(result.error);
        })
        .catch(() => {
          if (request === loadRequest.current) setUsageError("That file could not be read.");
        })
        .finally(() => {
          if (request === loadRequest.current) setUsageBusy(false);
        });
    },
    loadSample: (kind: "current" | "history" = "current") => {
      const request = ++loadRequest.current;
      setUsageBusy(true);
      setUsageError("");
      void fetch(`${import.meta.env.BASE_URL}${kind === "history" ? "sample-usage-history.csv" : "sample-usage.csv"}`)
        .then((response) => {
          if (!response.ok) throw new Error("missing");
          return response.text();
        })
        .then((text) => {
          if (request !== loadRequest.current) return;
          previewUsageText(
            text,
            kind === "history" ? "Bundled historical demonstration sample" : "Bundled demonstration sample",
          );
          setNotice("Sample data loaded for demonstration. Review the preview before applying.");
        })
        .catch(() => {
          if (request === loadRequest.current) setUsageError("The sample file did not load.");
        })
        .finally(() => {
          if (request === loadRequest.current) setUsageBusy(false);
        });
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
      const request = ++loadRequest.current;
      setUsageBusy(false);
      return import("../security/read-upload")
        .then(({ readForecastFile }) => readForecastFile(file))
        .then((result) => {
          if (request !== loadRequest.current) return;
          if (result.ok) {
            loadPortfolio(result.value);
            setNotice(`Opened ${result.value.name || "saved forecast"}.`);
          } else {
            setNotice(result.error);
            toast.error(result.error);
          }
        })
        .catch(() => {
          if (request !== loadRequest.current) return;
          const error = "That file is not a forecast JSON.";
          setNotice(error);
          toast.error(error);
        });
    },
  };
}
