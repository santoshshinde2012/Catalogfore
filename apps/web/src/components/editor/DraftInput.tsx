import { createContext, useContext, useId, useState, type ComponentProps } from "react";

export const EditorDraftSource = createContext<object | null>(null);

type InputProps = Omit<
  ComponentProps<"input">,
  "type" | "value" | "onChange" | "onBlur" | "onFocus" | "onKeyDown" | "min" | "max"
> & { label: string };

function useDraft(value: string) {
  const source = useContext(EditorDraftSource);
  const [previous, setPrevious] = useState({ source, value });
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  if (previous.source !== source || previous.value !== value) {
    setPrevious({ source, value });
    setText(value);
    setError("");
  }
  return {
    text,
    error,
    setError,
    setFocused,
    input: {
      value: focused || error ? text : value,
      onFocus: () => {
        setFocused(true);
        if (!error) setText(value);
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
        setError("");
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      },
    },
  };
}

export function DraftNumberInput({
  label,
  value,
  min = 0,
  max = 1e12,
  onCommit,
  onClear,
  ...props
}: InputProps & {
  value: number | undefined;
  min?: number;
  max?: number;
  onCommit: (value: number) => void;
  onClear?: () => void;
}) {
  const draft = useDraft(value == null ? "" : String(value));
  const errorId = useId();
  return (
    <>
      <input
        {...props}
        {...draft.input}
        type="number"
        min={min}
        max={max}
        aria-label={label}
        aria-invalid={Boolean(draft.error)}
        aria-describedby={
          [props["aria-describedby"], draft.error ? errorId : ""].filter(Boolean).join(" ") || undefined
        }
        onBlur={(event) => {
          draft.setFocused(false);
          const amount = Number(draft.text);
          if (!event.currentTarget.validity.badInput && !draft.text.trim() && onClear) {
            draft.setError("");
            if (value !== undefined) onClear();
          } else if (
            event.currentTarget.validity.badInput ||
            !draft.text.trim() ||
            !Number.isFinite(amount) ||
            amount < min ||
            amount > max
          ) {
            const format = (bound: number) => bound.toLocaleString("en-US", { maximumFractionDigits: 12 });
            draft.setError(`Enter a number from ${format(min)} to ${format(max)}.`);
          } else {
            draft.setError("");
            if (amount !== value) onCommit(amount);
          }
        }}
      />
      {draft.error && <InputError id={errorId}>{draft.error}</InputError>}
    </>
  );
}

export function DraftTextInput({
  label,
  value,
  onCommit,
  ...props
}: InputProps & { value: string; onCommit: (value: string) => void }) {
  const draft = useDraft(value);
  const errorId = useId();
  return (
    <>
      <input
        {...props}
        {...draft.input}
        aria-label={label}
        aria-invalid={Boolean(draft.error)}
        aria-describedby={draft.error ? errorId : props["aria-describedby"]}
        onBlur={() => {
          draft.setFocused(false);
          const next = draft.text.trim();
          if (!next) draft.setError(`${label} cannot be blank.`);
          else {
            draft.setError("");
            if (next !== value) onCommit(next);
          }
        }}
      />
      {draft.error && <InputError id={errorId}>{draft.error}</InputError>}
    </>
  );
}

function InputError({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} role="alert" className="text-xs font-normal text-destructive">
      {children}
    </span>
  );
}
