import { listProducts, productCategories } from "@cayfore/engine/products";
import { ChevronDown, FileUp, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./ui/button";
import { SegmentedStrip, SegmentedStripItem } from "./ui/segmented-strip";
import { InfoTooltip } from "./ui/tooltip";

/** Add-product menu and the usage-file button. Owns its open state. */
export function LedgerMenu({
  onAdd,
  onUsageFile,
  usageBusy = false,
}: {
  onAdd: (productId: string) => void;
  onUsageFile: (file: File) => void;
  usageBusy?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const restoringFocus = useRef(false);
  const choicesRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const categories = productCategories();

  useEffect(() => {
    if (!menuOpen) return;
    const frame = requestAnimationFrame(() => choicesRef.current?.focus({ preventScroll: true }));
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(false);
        restoringFocus.current = true;
        addRef.current?.focus();
        restoringFocus.current = false;
      }
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  return (
    <div className="relative flex w-full min-w-0 flex-wrap justify-end gap-2 sm:w-auto" ref={menuRef}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-label="Usage CSV"
        disabled={usageBusy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUsageFile(file);
        }}
      />
      <InfoTooltip
        label="Start with actual usage"
        description="Import a usage CSV to build a forecast from your Databricks activity."
        side="top"
      >
        <Button
          data-usage-import-return
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={usageBusy}
        >
          <FileUp aria-hidden="true" />
          {usageBusy ? "Reading CSV…" : "From a usage file"}
        </Button>
      </InfoTooltip>
      <InfoTooltip
        label="Add a Databricks product"
        description="Choose a product, then set its usage and pricing assumptions in your forecast."
        side="top"
      >
        <Button
          ref={addRef}
          type="button"
          size="sm"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onFocus={(event) => {
            // Returning from the chooser must not add a tooltip to the Escape dismissal stack.
            if (restoringFocus.current) event.preventDefault();
          }}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Plus aria-hidden="true" />
          Add product
          <ChevronDown
            aria-hidden="true"
            className={`transition-transform motion-reduce:transition-none ${menuOpen ? "rotate-180" : ""}`}
          />
        </Button>
      </InfoTooltip>
      {menuOpen && (
        <div
          ref={choicesRef}
          id={menuId}
          role="region"
          aria-label="Choose a product"
          tabIndex={0}
          className="absolute top-full right-0 z-20 mt-2 max-h-[65vh] w-[min(22rem,calc(100vw-3rem))] overflow-auto overscroll-contain rounded-2xl border bg-popover p-2 shadow-xl"
        >
          <div className="px-2 pt-2 pb-3">
            <p className="text-sm font-semibold">Build your forecast</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose the product your workload uses.</p>
          </div>
          <SegmentedStrip label="Product category" variant="scroll" value={category} onValueChange={setCategory}>
            <SegmentedStripItem value="all">All</SegmentedStripItem>
            {categories.map((item) => (
              <SegmentedStripItem key={item.id} value={item.id}>
                {item.label}
              </SegmentedStripItem>
            ))}
          </SegmentedStrip>
          {categories
            .filter((item) => category === "all" || item.id === category)
            .map((group) => (
              <div key={group.id}>
                <div className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </div>
                {listProducts()
                  .filter((item) => item.category === group.id)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted motion-reduce:transition-none"
                      onClick={() => {
                        onAdd(item.id);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="block text-sm font-medium">{item.menuLabel}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {item.summary}
                        {item.listPrice === "unpublished" ? " · No list rate is published" : ""}
                      </span>
                    </button>
                  ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
