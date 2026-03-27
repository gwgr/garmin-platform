import type { ActivityRecord } from "../../lib/api";

import { LineChartCard } from "./LineChartCard";

type HeartRateChartProps = {
  records: ActivityRecord[];
};

export function HeartRateChart({ records }: HeartRateChartProps) {
  const points = records
    .filter((record): record is ActivityRecord & { heart_rate: number } => Boolean(record.heart_rate))
    .map((record, index) => ({
      x: record.elapsed_seconds ?? index,
      y: record.heart_rate,
    }));

  return (
    <LineChartCard
      emptyMessage="Heart rate chart needs heart rate samples in the record stream."
      xAxisLabel="Elapsed"
      xValueKind="elapsed"
      points={points}
      title="Heart Rate"
      yValueKind="bpm"
      yAxisLabel="Heart rate"
    />
  );
}
