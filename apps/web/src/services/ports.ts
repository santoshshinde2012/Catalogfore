/** Browser capabilities the planner needs. Presentation receives these; it does not read globals. */

export interface Clock {
  now(): number;
  today(): string;
}

export interface Scheduler {
  frame(task: () => void): number;
  cancel(id: number): void;
  later(task: () => void, delayMs: number): number;
  clear(id: number): void;
  /** Run during idle time. The returned function cancels the callback. */
  idle(task: () => void, timeoutMs: number, fallbackMs: number): () => void;
}

/** Changes only. `online()` is the current value; `subscribe` does not emit it. */
export interface NetworkStatus {
  online(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface ClipboardPort {
  writeText(value: string): Promise<void>;
}

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface MotionQuery {
  matches(): boolean;
  subscribe(listener: (reduced: boolean) => void): () => void;
}

export interface TextFetcher {
  getText(url: string): Promise<string>;
}
