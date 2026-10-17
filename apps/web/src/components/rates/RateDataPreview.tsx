import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SearchX,
} from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useRef } from "react";
import { RateTableRow } from "./RateTableRow";
import type { RateDataTableState, RateSortKey } from "./useRateDataTable";

const columns: { label: string; key?: RateSortKey; hint?: string; right?: boolean }[] = [
  { label: "Product / component", key: "productName" },
  { label: "Cloud", key: "cloud" },
  { label: "Region", key: "region" },
  { label: "Edition", key: "tier" },
  { label: "Quoted rate", key: "price", hint: "Sort by USD quote; rules and unresolved rates follow", right: true },
  { label: "Billing unit" },
  { label: "Evidence", key: "evidenceLevel" },
  { label: "Source / dates" },
];
const count = (value: number) => value.toLocaleString("en-US");

export function RateDataPreview({
  table,
  onInspect,
}: {
  table: RateDataTableState;
  onInspect?: (row: UnitCostRow) => void;
}) {
  const { sort, changeSort, orderedRows, visibleRows, page, pageCount, pageSize, setPage, setPageSize, start } = table;
  const scrollRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRegion.current) return;
    scrollRegion.current.scrollTop = 0;
    if (!orderedRows.length) scrollRegion.current.scrollLeft = 0;
  }, [page, pageSize, orderedRows]);
  return (
    <>
      <div
        ref={scrollRegion}
        role="region"
        aria-label="Unit cost data preview"
        aria-describedby="rate-preview-help"
        tabIndex={0}
        className="relative max-h-[34rem] overflow-auto overscroll-contain border-y focus-visible:outline-offset-[-2px]"
      >
        <table className="w-full min-w-[68rem] table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            Unit cost catalog preview. Key pricing, placement and evidence fields; downloads retain all 40 canonical
            fields and row IDs.
          </caption>
          <colgroup>
            {[204, 88, 128, 100, 136, 112, 144, 176].map((width, index) => (
              <col key={index} style={{ width: `${width / 10.88}%` }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-muted text-[11px] tracking-wide text-muted-foreground">
            <tr>
              {columns.map(({ label, key, hint, right }) => {
                const direction = sort && sort.key === key ? sort.direction : "none";
                const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
                return (
                  <th
                    key={label}
                    scope="col"
                    aria-sort={key ? direction : undefined}
                    className={`border-b px-3 font-medium ${right ? "text-right" : ""}`}
                  >
                    {key ? (
                      <button
                        type="button"
                        onClick={() => changeSort(key)}
                        title={hint}
                        className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap hover:text-foreground ${right ? "justify-end" : ""}`}
                      >
                        {label}
                        <Icon
                          className={`size-3.5 shrink-0 ${direction !== "none" ? "text-foreground" : "opacity-55"}`}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <span className="inline-flex min-h-11 items-center whitespace-nowrap">{label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <RateTableRow key={row.id} row={row} onInspect={onInspect} />
            ))}
            {orderedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-10 text-sm">
                  <div className="flex max-w-[calc(100vw-7rem)] items-start gap-3 sm:max-w-md">
                    <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="font-medium">No rows match these filters</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Adjust the filters above or preview the complete catalog.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
        <p role="status" className="text-xs text-muted-foreground">
          {orderedRows.length ? `${count(start + 1)}–${count(Math.min(start + pageSize, orderedRows.length))}` : "0"} of{" "}
          {count(orderedRows.length)} rows
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Rows per page
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="min-h-11 rounded-md border border-input bg-background px-2 text-foreground"
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <nav aria-label="Catalog preview pagination" className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="First page"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              <ChevronsLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-16 text-center text-xs tabular-nums">
              {count(page + 1)} / {count(pageCount)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Next page"
              disabled={page >= pageCount - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Last page"
              disabled={page >= pageCount - 1}
              onClick={() => setPage(pageCount - 1)}
            >
              <ChevronsRight aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </>
  );
}
