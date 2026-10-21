import { useId, useState, type ReactNode } from "react";
import { Input } from "../ui/input";

/** Keep incomplete edits out of the shared forecast until the user commits a valid value. */
export function PlanningNumberField({
  label,
  name,
  value,
  source,
  max,
  step,
  optional = false,
  errorMessage,
  help,
  onCommit,
}: {
  label: string;
  name: string;
  value: number | undefined;
  source: object;
  max: number;
  step: number;
  optional?: boolean;
  errorMessage: string;
  help: ReactNode;
  onCommit: (value: number | undefined) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [previousSource, setPreviousSource] = useState(source);
  if (previousSource !== source) {
    setPreviousSource(source);
    setDraft(value == null ? "" : String(value));
    setInvalid(false);
  }
  return (
    <div className="grid min-w-0 content-start gap-2">
      <label className="field min-w-0">
        {label}
        <Input
          type="number"
          min={0}
          max={max}
          step={step}
          aria-label={name}
          aria-invalid={invalid}
          aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ""}`}
          placeholder={optional ? "Optional" : undefined}
          value={focused || invalid ? draft : (value ?? "")}
          onFocus={() => {
            setFocused(true);
            if (!invalid) setDraft(value == null ? "" : String(value));
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          onBlur={(event) => {
            setFocused(false);
            if (event.currentTarget.validity.badInput) {
              setInvalid(true);
              return;
            }
            if (!draft.trim() && optional) {
              setInvalid(false);
              onCommit(undefined);
              return;
            }
            const amount = Number(draft);
            if (!draft.trim() || !Number.isFinite(amount) || amount < 0 || amount > max) {
              setInvalid(true);
              return;
            }
            setInvalid(false);
            onCommit(amount);
          }}
        />
      </label>
      {invalid && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      <p id={`${id}-help`} className="text-xs font-normal leading-relaxed text-muted-foreground">
        {help}
      </p>
    </div>
  );
}
