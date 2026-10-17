export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(month: string, offset: number): string {
  const [year, calendarMonth] = month.split("-").map(Number);
  return new Date(Date.UTC(year, calendarMonth - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function monthIndex(month: string): number {
  const [year, calendarMonth] = month.split("-").map(Number);
  return year * 12 + calendarMonth - 1;
}

export function calendarDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^(19|20|21)\d{2}-\d{2}-\d{1,2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}
