export type NoticeTone = "success" | "error" | "message";

export interface NoticeAction {
  label: string;
  run: () => void;
}

export interface Notice {
  tone: NoticeTone;
  title: string;
  description?: string;
  undo?: () => void;
  action?: NoticeAction;
}

export interface Notifier {
  show(notice: Notice): void;
}

const imported = {
  replace: "Replaced the baseline with imported usage.",
  append: "Appended imported usage. Review combined scope for overlap.",
} as const;

/** Every toast the planner shows. A new message is a new entry. */
export const notices = {
  linkCopied: (): Notice => ({ tone: "success", title: "Link copied" }),
  linkUnavailable: (): Notice => ({
    tone: "error",
    title: "This forecast is too large for a share link. Export JSON to save or share it.",
  }),
  forecastReset: (undo: () => void): Notice => ({
    tone: "success",
    title: "Started a new forecast",
    description: "The default plan is restored.",
    undo,
  }),
  usageImported: (mode: keyof typeof imported, undo: () => void): Notice => ({
    tone: "success",
    title: mode === "replace" ? "Usage imported" : "Usage appended",
    description: imported[mode],
    undo,
  }),
  exportReady: (label: string): Notice => ({ tone: "success", title: `${label} downloaded` }),
  problem: (message: string): Notice => ({ tone: "error", title: message }),
  backOnline: (): Notice => ({ tone: "success", title: "Back online" }),
  sampleReady: (): Notice => ({ tone: "success", title: "Sample ready to review" }),
  forecastOpened: (description: string): Notice => ({ tone: "success", title: "Forecast opened", description }),
  addedProduct: (): Notice => ({
    tone: "message",
    title: "Added to your forecast",
    description: "Review the new workload in Advanced. Undo last change can restore your previous plan.",
  }),
  quantityKept: (): Notice => ({
    tone: "message",
    title: "Quantity kept in the calculator",
    description: "Review the quantity and pricing requirements shown beside the calculator.",
  }),
  forecastUpdated: (productName: string, view: () => void): Notice => ({
    tone: "message",
    title: "Forecast updated",
    description: `${productName} now uses this quantity. Plan discounts still apply.`,
    action: { label: "View forecast", run: view },
  }),
  workloadRemoved: (undo: () => void): Notice => ({ tone: "message", title: "Workload removed", undo }),
};

export function noticeAction(notice: Notice): NoticeAction | undefined {
  if (notice.undo) return { label: "Undo", run: notice.undo };
  return notice.action;
}
