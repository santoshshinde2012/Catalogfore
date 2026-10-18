import { Search, X } from "lucide-react";
import { cloneElement, isValidElement, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";

/** Radix reserves "" for clearing a select, so blank choices use a private sentinel. */
const EMPTY = "__empty__";
const SEARCH_AFTER = 10;

export interface OptionSelectChoice {
  value: string;
  label: string;
  leading?: ReactNode;
}

/**
 * Labeled single-select used everywhere a choice used to be a native menu.
 * Callers own the option list and the effect of a change; this control owns presentation,
 * search, and the accessible name.
 */
export function OptionSelect({
  label,
  name,
  value,
  onValueChange,
  options,
  placeholder = "Select",
  disabled,
  searchable,
  layout = "stacked",
  tone = "filter",
  className,
  triggerClassName,
  labelClassName,
  controls,
}: {
  label: string;
  /** Accessible name when it should differ from the visible label. */
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly OptionSelectChoice[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  layout?: "stacked" | "inline";
  tone?: "filter" | "field";
  className?: string;
  triggerClassName?: string;
  labelClassName?: string;
  controls?: string;
}) {
  const labelId = useId();
  const controlId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const choices =
    value !== "" && options.some((option) => option.value === value)
      ? options
      : value === ""
        ? options
        : [{ value, label: value }, ...options];
  const showSearch = searchable ?? choices.length > SEARCH_AFTER;
  const normalized = query.trim().toLowerCase();
  const visible = normalized ? choices.filter((option) => option.label.toLowerCase().includes(normalized)) : choices;
  const selected = choices.find((option) => option.value === value);
  return (
    <div className={cn(layout === "inline" ? "flex items-center gap-2" : "grid min-w-0 gap-2", className)}>
      <label
        id={labelId}
        htmlFor={controlId}
        className={cn(
          tone === "filter" ? "text-xs font-medium text-muted-foreground" : "text-sm font-medium",
          layout === "inline" && "shrink-0",
          labelClassName,
        )}
      >
        {label}
      </label>
      <Select
        value={value === "" ? EMPTY : value}
        disabled={disabled}
        onOpenChange={(open) => {
          if (!open) {
            setQuery("");
            return;
          }
          if (!showSearch) return;
          window.setTimeout(() => searchRef.current?.focus(), 0);
        }}
        onValueChange={(next) => onValueChange(next === EMPTY ? "" : next)}
      >
        <SelectTrigger
          id={controlId}
          aria-label={name}
          aria-labelledby={name ? undefined : labelId}
          aria-controls={controls}
          data-value={value}
          title={selected?.label}
          className={cn(layout === "inline" && "w-auto min-w-20", triggerClassName)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.leading && (
              <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                {isValidElement(selected.leading) ? cloneElement(selected.leading) : selected.leading}
              </span>
            )}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
        </SelectTrigger>
        <SelectContent
          className={layout === "inline" ? "w-auto min-w-[var(--radix-select-trigger-width)]" : undefined}
          header={
            showSearch ? (
              <OptionSearch label={name ?? label} query={query} inputRef={searchRef} onQuery={setQuery} />
            ) : undefined
          }
        >
          {visible.map((option) => (
            <SelectItem
              key={option.value || EMPTY}
              value={option.value === "" ? EMPTY : option.value}
              data-value={option.value}
            >
              <span className="flex min-w-0 items-center gap-2">
                {option.leading && (
                  <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                    {option.leading}
                  </span>
                )}
                <span className="min-w-0 whitespace-normal">{option.label}</span>
              </span>
            </SelectItem>
          ))}
          {visible.length === 0 && (
            <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">No matching options</p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionSearch({
  label,
  query,
  inputRef,
  onQuery,
}: {
  label: string;
  query: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onQuery: (value: string) => void;
}) {
  return (
    <div className="border-b p-2" onPointerDown={(event) => event.stopPropagation()}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          aria-label={`Search ${label}`}
          value={query}
          placeholder="Search"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              event.currentTarget.closest("[role='listbox']")?.querySelector<HTMLElement>("[role='option']")?.focus();
              return;
            }
            // Radix treats unmatched keys as typeahead and would steal the query.
            event.stopPropagation();
          }}
          className="h-9 w-full rounded-md border border-input bg-background pr-8 pl-8 text-sm outline-none focus-visible:border-ring"
        />
        {query && (
          <button
            type="button"
            aria-label={`Clear ${label} search`}
            className="absolute top-0 right-0 flex h-9 w-8 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              onQuery("");
              inputRef.current?.focus();
            }}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
