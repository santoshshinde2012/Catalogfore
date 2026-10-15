import type { ForecastPoint } from "@dcf/engine";

interface ChartProps {
  points: ForecastPoint[];
  title: string;
}

export function ForecastChart({ points, title }: ChartProps) {
  const width = 640;
  const height = 240;
  const padL = 44;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const max = Math.max(1, ...points.map((point) => point.total));
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (index: number) => padL + (points.length === 1 ? innerW / 2 : (index * innerW) / (points.length - 1));
  const y = (value: number) => padT + innerH - (value / max) * innerH;
  const path = (upper: number[], lower: number[]) => {
    const forward = upper.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`);
    const back = [...lower].reverse().map((value, index) => `L${x(lower.length - 1 - index).toFixed(1)},${y(value).toFixed(1)}`);
    return `${forward.join(" ")} ${back.join(" ")} Z`;
  };
  const cloud = points.map((point) => point.cloudCost);
  const dbuTop = points.map((point) => point.cloudCost + point.dbuCost);
  const total = points.map((point) => point.total);
  const zero = points.map(() => 0);
  const ticks = [0, 0.5, 1];

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={padL} x2={width - padR} y1={y(max * tick)} y2={y(max * tick)} stroke="rgba(255,255,255,0.12)" />
            <text className="axis" x={padL - 6} y={y(max * tick) + 4} textAnchor="end">
              {tick === 0 ? "0" : tick === 1 ? formatAxis(max) : formatAxis(max * tick)}
            </text>
          </g>
        ))}
        <path d={path(cloud, zero)} fill="#8fa884" opacity="0.9" />
        <path d={path(dbuTop, cloud)} fill="#e39a62" opacity="0.95" />
        <path d={path(total, dbuTop)} fill="#efe6d4" opacity="0.8" />
        <text className="axis" x={x(0)} y={height - 8}>
          M1
        </text>
        <text className="axis" x={x(points.length - 1)} y={height - 8} textAnchor="end">
          M{points.length}
        </text>
      </svg>
    </div>
  );
}

function formatAxis(value: number): string {
  if (value >= 1_000_000) return `$${Math.round(value / 100_000) / 10}m`;
  if (value >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${Math.round(value)}`;
}
