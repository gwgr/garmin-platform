import type { ActivityRecord } from "../../lib/api";

import { LineChartCard } from "./LineChartCard";

type ElevationChartProps = {
  records: ActivityRecord[];
};

export function ElevationChart({ records }: ElevationChartProps) {
  const points = records
    .filter(
      (record): record is ActivityRecord & { altitude_meters: number } =>
        record.altitude_meters !== null,
    )
    .map((record, index) => ({
      x: record.elapsed_seconds ?? index,
      y: record.altitude_meters,
    }));

  return (
    <LineChartCard
      emptyMessage="Elevation chart needs altitude samples in the record stream."
      xAxisLabel="Elapsed"
      xValueKind="elapsed"
      points={points}
      title="Elevation"
      yValueKind="meters"
      yAxisLabel="Altitude"
    />
  );
}
