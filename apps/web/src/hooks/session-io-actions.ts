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
import { usageLoads } from "./session-usage-loads";

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
    setUsageProgress,
    setUsagePreview,
    setNotice,
  } = controls;
  function loadPortfolio(input: Portfolio) {
    const next = normalizePortfolio(input);
    loadRequest.current += 1;
    setUsageBusy(false);
    setUsageProgress(null);
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
    setUsageProgress(null);
    previewUsageText(text, sourceLabel);
  }
  return {
    loadPortfolio,
    loadUsageText,
    loadUsagePreview: (preview: UsageImportPreview, mode: "replace" | "append") => {
      try {
        const loaded = portfolioFromUsage(preview, { base: portfolio, mode });
        const previous = portfolio;
        loadPortfolio(loaded.portfolio);
        setUsagePreview(null);
        setUsageError("");
        const description =
          mode === "replace"
            ? "Replaced the baseline with imported usage."
            : "Appended imported usage. Review combined scope for overlap.";
        setNotice(description);
        toast.success(mode === "replace" ? "Usage imported" : "Usage appended", {
          description,
          action: {
            label: "Undo",
            onClick: () => {
              setUndo(null);
              setOverride(normalizePortfolio(previous));
              const simple = planFromPortfolio(previous);
              if (simple) setPlan(simple);
              setSelectedId(previous.workloads[0]?.id ?? null);
              setNotice("Import undone. Your previous forecast is restored.");
            },
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "That usage could not be imported.";
        setUsageError(message);
        toast.error(message);
      }
    },
    dismissUsagePreview: () => {
      loadRequest.current += 1;
      setUsageBusy(false);
      setUsageProgress(null);
      setUsagePreview(null);
      setUsageError("");
      setNotice("Import cancelled. Your forecast is unchanged.");
    },
    ...usageLoads(controls, previewUsageText),
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
      setUsageProgress(null);
      return import("../security/read-upload")
        .then(({ readForecastFile }) => readForecastFile(file))
        .then((result) => {
          if (request !== loadRequest.current) return;
          if (result.ok) {
            loadPortfolio(result.value);
            const opened = `Opened ${result.value.name || "saved forecast"}.`;
            setNotice(opened);
            toast.success("Forecast opened", { description: opened });
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
