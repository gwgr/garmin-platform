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
      x: record.elapsed_seconds ?? index,
      y: metersPerSecondToMinutesPerKilometer(record.speed_mps),
    }));

  return (
    <LineChartCard
      emptyMessage="Pace chart needs speed samples in the record stream."
      xAxisLabel="Elapsed"
      xValueKind="elapsed"
      points={points}
      title="Pace"
      yValueKind="pace-km"
      yAxisLabel="Pace"
    />
  );
}
