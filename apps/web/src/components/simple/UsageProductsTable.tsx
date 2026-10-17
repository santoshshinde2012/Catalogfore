import type { UsageImportPreview } from "@cayfore/engine";
import { productCatalog } from "@cayfore/catalog";
import { money } from "../../format";

export function UsageProductsTable({ preview }: { preview: UsageImportPreview }) {
  const rows = [
    ...preview.products.map((row) => ({
      ...row,
      label: productCatalog.products.find((product) => product.id === row.productId)?.name ?? row.productId,
      mapped: true,
    })),
    ...preview.unmapped.map((row) => ({ ...row, productId: row.skuName, label: row.skuName, mapped: false })),
  ];
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">Selected products and quantities</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Known cost is the exported subtotal, before catalog fallback.
      </p>
      <div
        className="mt-3 overflow-x-auto rounded-lg border"
        tabIndex={0}
        role="region"
        aria-label="Selected product details"
      >
        <table className="w-full min-w-[390px] text-left text-sm">
          <caption className="sr-only">Selected products and quantities</caption>
          <thead>
            <tr className="bg-muted/60 text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2.5">
                Product / cloud
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Quantity
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Known cost
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.productId}-${row.cloud}-${row.unit}-${index}`} className="border-t">
                <th scope="row" className="max-w-52 px-3 py-3 break-words font-medium">
                  {row.label}
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                    {row.cloud?.toUpperCase() ?? "Selected cloud"}
                    {!row.mapped ? " · unmapped SKU" : ""}
                    {row.unpricedRows > 0 ? ` · ${row.unpricedRows} rows without prices` : ""}
                  </span>
                </th>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  <span className="mt-1 block text-[11px] text-muted-foreground">{row.unit}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.dollars == null ? "Unpriced" : money(row.dollars, 2)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="px-3 py-5 text-center text-sm text-muted-foreground">
                  No products are available for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground sm:hidden">
        Scroll the table horizontally to see every column.
      </p>
    </div>
  );
}
