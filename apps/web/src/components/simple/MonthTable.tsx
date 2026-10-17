import type { SimpleMonth } from "@cayfore/engine";
import { periodAt, periodLabel } from "../../lib/chart-data";
import { money } from "../../format";

export function MonthTable({ months, startMonth }: { months: SimpleMonth[]; startMonth?: string }) {
  return (
    <div
      className="overflow-x-auto rounded-lg focus-visible:outline-offset-2"
      role="region"
      aria-label="Monthly forecast amounts"
      tabIndex={0}
    >
      <table
        className="w-full border-collapse text-sm tabular-nums"
        aria-label="Month by month, low, expected, and high"
      >
        <caption className="pb-3 text-left text-xs text-muted-foreground">
          Monthly amounts in USD. Low and high values show the planning range.
        </caption>
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Month
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Low
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Expected
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              High
            </th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.month} className="border-t">
              <th scope="row" className="whitespace-nowrap py-3 pr-3 text-left font-medium">
                {startMonth ? periodLabel(periodAt(startMonth, month.month - 1)) : month.month}
              </th>
              <td className="py-2 pr-3 text-right text-muted-foreground">{money(month.low, 2)}</td>
              <td className="py-2 pr-3 text-right">{money(month.expected, 2)}</td>
              <td className="py-2 text-right text-muted-foreground">{money(month.high, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
