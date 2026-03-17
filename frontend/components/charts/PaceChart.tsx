import type { ActivityRecord } from "../../lib/api";

import { LineChartCard } from "./LineChartCard";

type PaceChartProps = {
  records: ActivityRecord[];
};

function metersPerSecondToMinutesPerKilometer(speedMps: number): number {
  const secondsPerKilometer = 1000 / speedMps;
  return secondsPerKilometer / 60;
}

export function PaceChart({ records }: PaceChartProps) {
  const points = records
    .filter((record): record is ActivityRecord & { speed_mps: number } => Boolean(record.speed_mps))
    .map((record, index) => ({
      x: index,
      y: metersPerSecondToMinutesPerKilometer(record.speed_mps),
    }));

  return (
    <LineChartCard
      emptyMessage="Pace chart needs speed samples in the record stream."
      points={points}
      subtitle="Derived from record stream speed values."
      title="Pace"
      valueFormatter={(value) => `${value.toFixed(2)} min/km`}
    />
  );
}
