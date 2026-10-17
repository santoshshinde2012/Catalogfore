import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { useEffect, useMemo, useState } from "react";
import { evidenceLabels } from "./rate-presentation";

export type RateSortKey = "productName" | "cloud" | "region" | "tier" | "price" | "evidenceLevel";
type RateSort = { key: RateSortKey; direction: "ascending" | "descending" } | null;

function sortValue(row: UnitCostRow, key: RateSortKey): string | number | null {
  if (key === "price") return row.rateKind === "money" ? row.unitPriceUsd : null;
  if (key === "region") return row.regionLabel ?? row.region;
  if (key === "evidenceLevel") return evidenceLabels[row.evidenceLevel];
  return row[key];
}

function compareRows(left: UnitCostRow, right: UnitCostRow, sort: NonNullable<RateSort>): number {
  const a = sortValue(left, sort.key);
  const b = sortValue(right, sort.key);
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  const compared =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
  return sort.direction === "ascending" ? compared : -compared;
}

export function useRateDataTable(rows: UnitCostRow[]) {
  const [sort, setSort] = useState<RateSort>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const orderedRows = useMemo(() => (sort ? [...rows].sort((a, b) => compareRows(a, b, sort)) : rows), [rows, sort]);
  const pageCount = Math.max(1, Math.ceil(orderedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  useEffect(() => setPage(0), [rows, sort, pageSize]);
  function changeSort(key: RateSortKey) {
    setSort((current) =>
      current?.key === key
        ? current.direction === "ascending"
          ? { key, direction: "descending" }
          : null
        : { key, direction: "ascending" },
    );
  }
  return {
    sort,
    changeSort,
    orderedRows,
    visibleRows: orderedRows.slice(start, start + pageSize),
    page: currentPage,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
    start,
  };
}

export type RateDataTableState = ReturnType<typeof useRateDataTable>;
