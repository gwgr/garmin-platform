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
      x: index,
      y: record.altitude_meters,
    }));

  return (
    <LineChartCard
      emptyMessage="Elevation chart needs altitude samples in the record stream."
      points={points}
      subtitle="Altitude samples pulled from the stored record stream."
      title="Elevation"
      valueFormatter={(value) => `${value.toFixed(1)} m`}
    />
  );
}
