const sources = [];

/** A signal source returns note lines. It does not open files or choose today's date. */
export function registerSignal(source) {
  if (!source?.id || typeof source.collect !== "function") throw new Error("signal source needs an id and collect");
  if (sources.some((existing) => existing.id === source.id)) throw new Error(`duplicate signal ${source.id}`);
  sources.push(source);
}

export function signalSources() {
  return sources;
}

export async function collectSignals(env) {
  const notes = [];
  for (const source of sources) notes.push(...(await source.collect(env)));
  return notes;
}
