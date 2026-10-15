export function money(value: number, digits?: number): string {
  const abs = Math.abs(value);
  const fraction = digits ?? (abs >= 1000 ? 0 : 2);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(value);
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
