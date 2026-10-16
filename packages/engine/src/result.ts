/** A success or a failure. Callers branch on `ok` instead of catching. */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

/** Wrap a successful value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap a failure. The error is data, not a thrown exception. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
