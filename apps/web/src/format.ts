export { formatUsd as money } from "@cayfore/engine";

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
