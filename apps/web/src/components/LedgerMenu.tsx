import { listProducts, productCategories } from "@cayfore/engine/products";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./ui/button";

/** Add-product menu and the usage-file button. Owns its open state. */
export function LedgerMenu({
  onAdd,
  onUsageFile,
}: {
  onAdd: (productId: string) => void;
  onUsageFile: (file: File) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const categories = productCategories();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="relative flex gap-2" ref={menuRef}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
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
          id={menuId}
          className="absolute right-0 z-20 mt-2 max-h-[70vh] w-80 overflow-auto rounded-lg border bg-popover p-2 shadow-lg"
        >
          {categories.map((category) => (
            <div key={category.id}>
              <div className="px-2 pt-2 text-xs font-medium text-muted-foreground">{category.label}</div>
              {listProducts()
                .filter((item) => item.category === category.id)
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
