import { listProducts, productCategories } from "@cayfore/engine/products";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./ui/button";
import { SegmentedStrip, SegmentedStripItem } from "./ui/segmented-strip";

/** Add-product menu and the usage-file button. Owns its open state. */
export function LedgerMenu({
  onAdd,
  onUsageFile,
}: {
  onAdd: (productId: string) => void;
  onUsageFile: (file: File) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
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
        addRef.current?.focus();
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
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUsageFile(file);
        }}
      />
      <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
        From a usage file
      </Button>
      <Button
        ref={addRef}
        type="button"
        size="sm"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
      >
        Add product
      </Button>
      {menuOpen && (
        <div
          ref={choicesRef}
          id={menuId}
          role="region"
          aria-label="Choose a product"
          tabIndex={0}
          className="absolute top-full right-0 z-20 mt-2 max-h-[65vh] w-[min(20rem,calc(100vw-3rem))] overflow-auto overscroll-contain rounded-lg border bg-popover p-2 shadow-lg"
        >
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
                <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">{group.label}</div>
                {listProducts()
                  .filter((item) => item.category === group.id)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        onAdd(item.id);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="block text-sm font-medium">{item.menuLabel}</span>
                      <span className="block text-xs text-muted-foreground">
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
