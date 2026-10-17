import type { Workload } from "@cayfore/engine";
import { numberOr } from "./fields";

interface ProductField {
  path: string;
  label: string;
  type: "number" | "select" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export function SchemaFields({
  workload,
  fields,
  onChange,
}: {
  workload: Workload;
  fields: readonly ProductField[];
  onChange: (workload: Workload) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="mt-3 grid gap-3">
      {fields.map((field) => (
        <label key={field.path} className="field">
          {field.label}
          {field.type === "boolean" ? (
            <input
              type="checkbox"
              checked={Boolean(readPath(workload, field.path))}
              onChange={(event) => onChange(writePath(workload, field.path, event.target.checked))}
            />
          ) : field.type === "select" ? (
            <select
              value={String(readPath(workload, field.path) ?? "")}
              onChange={(event) => onChange(writePath(workload, field.path, event.target.value))}
            >
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={Number(readPath(workload, field.path) ?? 0)}
              onChange={(event) =>
                onChange(writePath(workload, field.path, numberOr(event.target.value, Number(field.min ?? 0))))
              }
            />
          )}
        </label>
      ))}
    </div>
  );
}

function readPath(workload: Workload, path: string): unknown {
  const [head, tail] = path.split(".");
  const record = workload as unknown as Record<string, unknown>;
  const value = record[head];
  if (!tail) return value;
  if (typeof value === "object" && value !== null) return (value as Record<string, unknown>)[tail];
  return undefined;
}

function writePath(workload: Workload, path: string, value: unknown): Workload {
  const [head, tail] = path.split(".");
  const record = workload as unknown as Record<string, unknown>;
  if (!tail) return { ...workload, [head]: value } as Workload;
  const current = record[head];
  const nested = typeof current === "object" && current !== null ? (current as Record<string, unknown>) : {};
  return { ...workload, [head]: { ...nested, [tail]: value } } as Workload;
}
