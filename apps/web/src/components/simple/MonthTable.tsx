import type { SimpleMonth } from "@dcf/engine";
import { money } from "../../format";

export function MonthTable({ months }: { months: SimpleMonth[] }) {
  return (
    <div className="table-scroll">
      <table className="month-table">
        <caption className="sr-only">Month by month, low, expected, and high</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Low</th>
            <th scope="col">Expected</th>
            <th scope="col">High</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.month}>
              <th scope="row">{month.month}</th>
              <td>{money(month.low, 0)}</td>
              <td>{money(month.expected, 0)}</td>
              <td>{money(month.high, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
