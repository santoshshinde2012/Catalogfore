import type { SimpleMonth } from "@cayfore/engine";
import { money } from "../../format";

export function MonthTable({ months }: { months: SimpleMonth[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">
        <caption className="sr-only">Month by month, low, expected, and high</caption>
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
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                {month.month}
              </th>
              <td className="py-2 pr-3 text-right text-muted-foreground">{money(month.low, 0)}</td>
              <td className="py-2 pr-3 text-right">{money(month.expected, 0)}</td>
              <td className="py-2 text-right text-muted-foreground">{money(month.high, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
