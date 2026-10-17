import type { UsageAttribution } from "@cayfore/engine";
import { money } from "../../format";

export function UsageOwnership({ rows }: { rows: readonly UsageAttribution[] }) {
  return (
    <div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Exported known costs only. Ownership labels stay local and appear in JSON downloads; copy link omits them.
      </p>
      {rows.length ? (
        <ul className="mt-3 divide-y rounded-lg border px-3">
          {rows.map((row) => (
            <li key={`${row.key}:${row.label}`} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 break-words">
                {row.label}
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {row.key.replaceAll("_", " ")}
                  {row.unpricedRows ? " · incomplete pricing" : ""}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{money(row.amount, 2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          No ownership labels are included in this plan. Add workspace, tag, or identity columns to your export to see
          ownership here.
        </p>
      )}
    </div>
  );
}
