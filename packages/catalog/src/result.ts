/** A success or a failure at a catalog IO boundary. */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

/** Wrap a successful value. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Wrap a failure message from schema validation. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
