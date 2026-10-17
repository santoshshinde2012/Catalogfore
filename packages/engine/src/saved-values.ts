export const finite = (value: unknown, minimum = 0, maximum = 1e15): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
export const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
export const oneOf = (value: unknown, allowed: readonly unknown[]) => allowed.includes(value);
