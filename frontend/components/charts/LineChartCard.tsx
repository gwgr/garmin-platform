import {
  emptyStateClass,
  listMetaClass,
} from "../../lib/ui";
import { Card, CardContent } from "../ui/card";

type ChartPoint = {
  x: number;
  y: number;
};

type LineChartCardProps = {
  title: string;
  subtitle: string;
  points: ChartPoint[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
};

const chartWidth = 640;
const chartHeight = 240;
const paddingX = 20;
const paddingY = 20;

function buildPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  return points
    .map((point, index) => {
      const normalizedX = maxX === minX ? 0.5 : (point.x - minX) / (maxX - minX);
      const normalizedY = maxY === minY ? 0.5 : (point.y - minY) / (maxY - minY);
      const x = paddingX + normalizedX * usableWidth;
      const y = chartHeight - paddingY - normalizedY * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function LineChartCard({
  title,
  subtitle,
  points,
  valueFormatter = (value) => value.toFixed(1),
  emptyMessage = "No chart data is available yet.",
}: LineChartCardProps) {
  const gradientId = `chart-${title.toLowerCase().replace(/\s+/g, "-")}-stroke`;

  if (points.length === 0) {
    return (
      <Card className="grid gap-4">
        <CardContent className="flex flex-col gap-4 p-[22px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-[1.2rem] font-semibold text-[var(--text)]">{title}</p>
              <p className={listMetaClass}>{subtitle}</p>
            </div>
          </div>
          <p className={emptyStateClass}>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const yValues = points.map((point) => point.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const path = buildPath(points);

  return (
    <Card className="grid gap-4">
      <CardContent className="grid gap-4 p-[22px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-[1.2rem] font-semibold text-[var(--text)]">{title}</p>
            <p className={listMetaClass}>{subtitle}</p>
          </div>
          <div className="grid gap-1 text-left text-[0.88rem] text-[var(--muted)] sm:text-right">
            <span>Min {valueFormatter(minY)}</span>
            <span>Max {valueFormatter(maxY)}</span>
          </div>
        </div>

        <svg
          aria-label={title}
          className="h-auto w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#1f6b5c" />
              <stop offset="100%" stopColor="#bb7142" />
            </linearGradient>
          </defs>
          <rect fill="rgba(255,255,255,0.35)" height={chartHeight} rx="20" width={chartWidth} />
          <path
            d={path}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        </svg>
      </CardContent>
    </Card>
  );
}
