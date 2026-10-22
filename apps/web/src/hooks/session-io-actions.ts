import {
  encodePortfolio,
  normalizePortfolio,
  portfolioFromUsage,
  previewUsageImport,
  type Portfolio,
  type UsageImportPreview,
} from "@cayfore/engine";
import { browserClipboard, browserClock } from "../services/browser-ports";
import { notices, type Notifier } from "../services/notices";
import type { ClipboardPort, Clock } from "../services/ports";
import { showNotice, sonnerNotifier } from "../services/sonner-notifier";
import { captureForecast, restoreForecast } from "./forecast-snapshot";
import { planFromPortfolio } from "./forecast-session";
import type { SessionControls } from "./session-controls";
import { usageLoads } from "./session-usage-loads";

export interface IoPorts {
  clock: Clock;
  clipboard: ClipboardPort;
  notifier: Notifier;
}

const defaultPorts: IoPorts = { clock: browserClock, clipboard: browserClipboard, notifier: sonnerNotifier };

export function ioActions(controls: SessionControls, ports: IoPorts = defaultPorts) {
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
        ...previewUsageImport(text, { asOf: ports.clock.today() }),
        ...(sourceLabel ? { sourceLabel } : {}),
      };
      if (!preview.records.length) {
        setUsageError(preview.warnings[0] ?? "That file did not contain usage rows.");
        return false;
      }
      setUsageError("");
      setUsagePreview(preview);
      return true;
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "That usage file could not be read.");
      return false;
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
        const snapshot = captureForecast(controls);
        const notice = notices.usageImported(mode, () => restoreForecast(controls, snapshot));
        loadPortfolio(loaded.portfolio);
        setUsagePreview(null);
        setUsageError("");
        setNotice(notice.description ?? "");
        showNotice(notice, ports.notifier);
      } catch (error) {
        const message = error instanceof Error ? error.message : "That usage could not be imported.";
        setUsageError(message);
        showNotice(notices.problem(message), ports.notifier);
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
      try {
        url.hash = `plan=${encodePortfolio(portfolio)}`;
      } catch {
        const problem = notices.linkUnavailable();
        setNotice(problem.title);
        showNotice(problem, ports.notifier);
        return;
      }
      try {
        await ports.clipboard.writeText(url.href);
        setNotice(notices.linkCopied().title);
        showNotice(notices.linkCopied(), ports.notifier);
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
            showNotice(notices.forecastOpened(opened), ports.notifier);
          } else {
            setNotice(result.error);
            showNotice(notices.problem(result.error), ports.notifier);
          }
        })
        .catch(() => {
          if (request !== loadRequest.current) return;
          const error = "That file is not a forecast JSON.";
          setNotice(error);
          showNotice(notices.problem(error), ports.notifier);
        });
    },
  };
}
