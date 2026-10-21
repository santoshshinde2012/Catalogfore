export const skeletonIds = ["chart", "products", "rates", "rates-table", "advanced"] as const;
export type SkeletonId = (typeof skeletonIds)[number];

export interface SkeletonGroup {
  className: string;
  bars: string[];
}

export interface SkeletonLayout {
  label: string;
  className: string;
  overlay?: boolean;
  spinner?: boolean;
  groups: SkeletonGroup[];
  nested?: SkeletonId;
}

const repeat = (className: string, count: number) => Array.from({ length: count }, () => className);

/** Heights match the screens they stand in for, so the swap does not move the page. */
export const skeletonLayouts: Record<SkeletonId, SkeletonLayout> = {
  chart: {
    label: "Loading chart",
    className: "relative h-60 lg:h-48",
    overlay: true,
    groups: [{ className: "", bars: ["absolute inset-0 rounded-lg"] }],
  },
  products: {
    label: "Loading the product map",
    className: "mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6",
    groups: [
      {
        className: "",
        bars: ["mb-3 h-4 w-36 rounded-md", "mb-4 h-10 w-72 max-w-full rounded-lg", "mb-5 h-11 w-full rounded-xl"],
      },
      { className: "grid grid-cols-2 gap-2 lg:grid-cols-4", bars: repeat("h-24 rounded-xl", 4) },
      { className: "mt-4 grid gap-2.5", bars: repeat("h-24 rounded-xl", 4) },
    ],
  },
  rates: {
    label: "Loading the price catalog",
    className: "mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6",
    groups: [
      {
        className: "",
        bars: [
          "mb-3 h-8 w-28 rounded-lg",
          "mb-2 h-10 w-64 max-w-full rounded-lg",
          "mb-5 h-4 w-full max-w-xl rounded-md",
        ],
      },
      { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3", bars: repeat("h-16 rounded-xl", 6) },
      { className: "", bars: ["mt-5 h-11 w-full rounded-xl"] },
    ],
    nested: "rates-table",
  },
  "rates-table": {
    label: "Loading the rates table",
    className: "min-h-96 border-y py-3",
    groups: [{ className: "", bars: ["mx-3 mb-3 h-8 rounded-md", ...repeat("mx-3 mb-2 h-11 rounded-md", 8)] }],
  },
  advanced: {
    label: "Loading workload editor…",
    className: "grid min-h-24 gap-2",
    spinner: true,
    groups: [{ className: "grid gap-2", bars: ["h-11 rounded-lg", "h-24 rounded-lg"] }],
  },
};
