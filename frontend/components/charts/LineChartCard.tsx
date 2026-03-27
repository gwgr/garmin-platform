"use client";

import { useId, useMemo, useState } from "react";

import { emptyStateClass, listMetaClass, panelLabelClass } from "../../lib/ui";
import {
  formatElapsedLabel,
  formatPaceMinutesPer100Meters,
  formatPaceMinutesPerKilometer,
  formatSpeedKilometersPerHour,
} from "../../lib/formatting";
import { Card, CardContent } from "../ui/card";

type ChartPoint = {
  x: number;
  y: number;
  label?: string;
};

type LineChartCardProps = {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  emptyMessage?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xValueKind?: "number" | "elapsed";
  yValueKind?: "number" | "pace-km" | "pace-100m" | "bpm" | "meters";
};

const chartWidth = 640;
const chartHeight = 240;
const paddingLeft = 54;
const paddingRight = 24;
const paddingTop = 24;
const paddingBottom = 36;

type ScaledPoint = ChartPoint & {
  svgX: number;
  svgY: number;
};

function formatXValue(kind: NonNullable<LineChartCardProps["xValueKind"]>, value: number): string {
  switch (kind) {
    case "elapsed":
      return formatElapsedLabel(value);
    default:
      return value.toFixed(0);
  }
}

function formatYValue(kind: NonNullable<LineChartCardProps["yValueKind"]>, value: number): string {
  switch (kind) {
    case "pace-km":
      return formatPaceMinutesPerKilometer(value);
    case "pace-100m":
      return formatPaceMinutesPer100Meters(value);
    case "bpm":
      return `${Math.round(value)} bpm`;
    case "meters":
      return `${value.toFixed(1)} m`;
    default:
      return value.toFixed(1);
  }
}

export function LineChartCard({
  title,
  subtitle,
  points,
  emptyMessage = "No chart data is available yet.",
  xAxisLabel = "Elapsed",
  yAxisLabel = "Value",
  xValueKind = "number",
  yValueKind = "number",
}: LineChartCardProps) {
  const gradientId = useId().replace(/:/g, "");

  if (points.length === 0) {
    return (
      <Card className="grid gap-4">
        <CardContent className="flex flex-col gap-4 p-[22px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-[1.2rem] font-semibold text-[var(--text)]">{title}</p>
              {subtitle ? <p className={listMetaClass}>{subtitle}</p> : null}
            </div>
          </div>
          <p className={emptyStateClass}>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const [activeIndex, setActiveIndex] = useState(points.length - 1);

  const chart = useMemo(() => {
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const yRange = maxY - minY || Math.max(Math.abs(maxY), 1);
    const paddedMinY = minY - yRange * 0.08;
    const paddedMaxY = maxY + yRange * 0.08;
    const usableWidth = chartWidth - paddingLeft - paddingRight;
    const usableHeight = chartHeight - paddingTop - paddingBottom;

    const scaleX = (value: number) =>
      paddingLeft + (maxX === minX ? 0.5 : (value - minX) / (maxX - minX)) * usableWidth;
    const scaleY = (value: number) =>
      chartHeight -
      paddingBottom -
      (paddedMaxY === paddedMinY ? 0.5 : (value - paddedMinY) / (paddedMaxY - paddedMinY)) * usableHeight;

    const scaledPoints: ScaledPoint[] = points.map((point) => ({
      ...point,
      svgX: scaleX(point.x),
      svgY: scaleY(point.y),
    }));

    const path = scaledPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.svgX.toFixed(1)} ${point.svgY.toFixed(1)}`)
      .join(" ");

    const yTicks = Array.from({ length: 4 }).map((_, index) => {
      const ratio = index / 3;
      const value = paddedMaxY - (paddedMaxY - paddedMinY) * ratio;
      return {
        value,
        y: scaleY(value),
      };
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      path,
      scaleX,
      scaleY,
      scaledPoints,
      yTicks,
    };
  }, [points]);

  const activePoint = chart.scaledPoints[Math.min(activeIndex, chart.scaledPoints.length - 1)];

  function setNearestPoint(clientX: number, bounds: DOMRect) {
    const relativeX = ((clientX - bounds.left) / bounds.width) * chartWidth;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    chart.scaledPoints.forEach((point, index) => {
      const distance = Math.abs(point.svgX - relativeX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(nearestIndex);
  }

  return (
    <Card className="grid gap-4">
      <CardContent className="grid gap-4 p-[22px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-[1.2rem] font-semibold text-[var(--text)]">{title}</p>
            {subtitle ? <p className={listMetaClass}>{subtitle}</p> : null}
          </div>
          <div className="grid gap-1 text-left text-[0.88rem] text-[var(--muted)] sm:text-right">
            <span>
              {xAxisLabel}: {activePoint.label ?? formatXValue(xValueKind, activePoint.x)}
            </span>
            <span>
              {yAxisLabel}: {formatYValue(yValueKind, activePoint.y)}
            </span>
          </div>
        </div>

        <svg
          aria-label={title}
          className="h-auto w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          onPointerLeave={() => setActiveIndex(points.length - 1)}
          onPointerMove={(event) => setNearestPoint(event.clientX, event.currentTarget.getBoundingClientRect())}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#1f6b5c" />
              <stop offset="100%" stopColor="#bb7142" />
            </linearGradient>
          </defs>
          <rect fill="rgba(255,255,255,0.35)" height={chartHeight} rx="20" width={chartWidth} />
          {chart.yTicks.map((tick) => (
            <g key={`${title}-${tick.value}`}>
              <line
                stroke="rgba(123, 107, 92, 0.18)"
                strokeDasharray="4 5"
                x1={paddingLeft}
                x2={chartWidth - paddingRight}
                y1={tick.y}
                y2={tick.y}
              />
              <text
                fill="rgba(110, 94, 79, 0.78)"
                fontSize="11"
                textAnchor="end"
                x={paddingLeft - 10}
                y={tick.y + 4}
              >
                {formatYValue(yValueKind, tick.value)}
              </text>
            </g>
          ))}
          <line
            stroke="rgba(123, 107, 92, 0.22)"
            x1={paddingLeft}
            x2={chartWidth - paddingRight}
            y1={chartHeight - paddingBottom}
            y2={chartHeight - paddingBottom}
          />
          <path
            d={chart.path}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <line
            stroke="rgba(31, 107, 92, 0.28)"
            strokeDasharray="4 4"
            x1={activePoint.svgX}
            x2={activePoint.svgX}
            y1={paddingTop}
            y2={chartHeight - paddingBottom}
          />
          <line
            stroke="rgba(187, 113, 66, 0.24)"
            strokeDasharray="4 4"
            x1={paddingLeft}
            x2={chartWidth - paddingRight}
            y1={activePoint.svgY}
            y2={activePoint.svgY}
          />
          <circle cx={activePoint.svgX} cy={activePoint.svgY} fill="#bb7142" r="6" stroke="#fffaf3" strokeWidth="3" />
          <text
            className={panelLabelClass}
            fill="rgba(110, 94, 79, 0.82)"
            fontSize="11"
            textAnchor="start"
            x={paddingLeft}
            y={chartHeight - 10}
          >
            {xAxisLabel}: {formatXValue(xValueKind, chart.minX)}
          </text>
          <text
            fill="rgba(110, 94, 79, 0.82)"
            fontSize="11"
            textAnchor="end"
            x={chartWidth - paddingRight}
            y={chartHeight - 10}
          >
            {formatXValue(xValueKind, chart.maxX)}
          </text>
        </svg>
      </CardContent>
    </Card>
  );
}
