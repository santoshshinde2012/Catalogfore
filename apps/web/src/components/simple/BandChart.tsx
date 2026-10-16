import type { SimpleMonth } from "@dcf/engine";

export function BandChart({ months, label }: { months: SimpleMonth[]; label: string }) {
  const width = 640;
  const height = 220;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const max = Math.max(1, ...months.map((month) => month.high));
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (index: number) => padL + (months.length <= 1 ? innerW / 2 : (index * innerW) / (months.length - 1));
  const y = (value: number) => padT + innerH - (value / max) * innerH;
  const line = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const high = months.map((month) => month.high);
  const low = months.map((month) => month.low);
  const expected = months.map((month) => month.expected);
  const band = `${line(high)} ${[...low]
    .reverse()
    .map((value, index) => `L${x(low.length - 1 - index).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ")} Z`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {[0, 0.5, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y(max * tick)}
              y2={y(max * tick)}
              stroke="currentColor"
              strokeOpacity="0.35"
            />
            <text className="axis" x={padL - 8} y={y(max * tick) + 4} textAnchor="end">
              {tick === 0 ? "0" : axisMoney(max * tick)}
            </text>
          </g>
        ))}
        <path d={band} fill="var(--lava)" opacity="0.22" />
        <path d={line(expected)} fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round" />
        <text className="axis" x={x(0)} y={height - 8}>
          Month 1
        </text>
        <text className="axis" x={x(months.length - 1)} y={height - 8} textAnchor="end">
          Month {months.length}
        </text>
      </svg>
    </div>
  );
}

function axisMoney(value: number): string {
  if (value >= 1_000_000) return `$${Math.round(value / 100_000) / 10}m`;
  if (value >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${Math.round(value)}`;
}
