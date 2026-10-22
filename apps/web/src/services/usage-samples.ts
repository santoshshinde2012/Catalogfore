export const usageSamples = {
  current: { href: "sample-usage.csv", source: "Bundled demonstration sample" },
  history: { href: "sample-usage-history.csv", source: "Bundled historical demonstration sample" },
} as const;

export type UsageSampleKind = keyof typeof usageSamples;

export const usageReadMarks = { opened: 0.04, reading: 0.08, readWeight: 0.64, readCap: 0.72, checked: 0.86, done: 1 };
