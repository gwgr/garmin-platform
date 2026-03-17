import type { ActivityRecord } from "../../lib/api";

import { LineChartCard } from "./LineChartCard";

type HeartRateChartProps = {
  records: ActivityRecord[];
};

export function HeartRateChart({ records }: HeartRateChartProps) {
  const points = records
    .filter((record): record is ActivityRecord & { heart_rate: number } => Boolean(record.heart_rate))
    .map((record, index) => ({
      x: index,
      y: record.heart_rate,
    }));

  return (
    <LineChartCard
      emptyMessage="Heart rate chart needs heart rate samples in the record stream."
      points={points}
      subtitle="Sampled from stored activity record rows."
      title="Heart Rate"
      valueFormatter={(value) => `${Math.round(value)} bpm`}
    />
  );
}
