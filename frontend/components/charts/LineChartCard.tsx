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
      <article className="panel chart-card">
        <div className="chart-header">
          <div>
            <p className="card-title">{title}</p>
            <p className="list-meta">{subtitle}</p>
          </div>
        </div>
        <p className="empty-state">{emptyMessage}</p>
      </article>
    );
  }

  const yValues = points.map((point) => point.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const path = buildPath(points);

  return (
    <article className="panel chart-card">
      <div className="chart-header">
        <div>
          <p className="card-title">{title}</p>
          <p className="list-meta">{subtitle}</p>
        </div>
        <div className="chart-stats">
          <span>Min {valueFormatter(minY)}</span>
          <span>Max {valueFormatter(maxY)}</span>
        </div>
      </div>

      <svg
        aria-label={title}
        className="chart-svg"
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
    </article>
  );
}
