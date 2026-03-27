"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useId, useMemo, useRef } from "react";

import type { ActivityRecord } from "../../lib/api";
import {
  emptyStateClass,
  listMetaClass,
} from "../../lib/ui";
import { Card, CardContent } from "../ui/card";

type RouteMapProps = {
  records: ActivityRecord[];
};

type CoordinatePoint = {
  latitude: number;
  longitude: number;
};

function extractCoordinates(records: ActivityRecord[]): CoordinatePoint[] {
  return records
    .filter(
      (record): record is ActivityRecord & {
        latitude_degrees: number;
        longitude_degrees: number;
      } => record.latitude_degrees !== null && record.longitude_degrees !== null,
    )
    .map((record) => ({
      latitude: record.latitude_degrees,
      longitude: record.longitude_degrees,
    }));
}

function hasLikelyDegrees(points: CoordinatePoint[]): boolean {
  return points.every(
    (point) =>
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180,
  );
}

export function RouteMap({ records }: RouteMapProps) {
  const mapId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const coordinatePoints = useMemo(() => extractCoordinates(records), [records]);
  const validCoordinatePoints = useMemo(
    () => (hasLikelyDegrees(coordinatePoints) ? coordinatePoints : []),
    [coordinatePoints],
  );

  useEffect(() => {
    if (!containerRef.current || validCoordinatePoints.length < 2) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function mountMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) {
        return;
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      });

      const latLngs = validCoordinatePoints.map((point) => [point.latitude, point.longitude] as [number, number]);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const routeLine = L.polyline(latLngs, {
        color: "#1f6b5c",
        weight: 4,
        opacity: 0.88,
      }).addTo(map);

      map.fitBounds(routeLine.getBounds(), {
        padding: [24, 24],
      });

      cleanup = () => {
        map.remove();
      };
    }

    void mountMap();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [validCoordinatePoints]);

  return (
    <Card className="grid min-h-[360px] gap-4">
      <CardContent className="grid gap-4 p-[22px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-[1.2rem] font-semibold text-[var(--text)]">Route Map</p>
            <p className={listMetaClass}>Leaflet map based on stored activity record coordinates.</p>
          </div>
        </div>

        {validCoordinatePoints.length >= 2 ? (
          <div
            aria-label="Activity route map"
            className="min-h-[280px] overflow-hidden rounded-[18px] border border-[color:var(--line)]"
            id={mapId}
            ref={containerRef}
          />
        ) : coordinatePoints.length >= 2 ? (
          <p className={emptyStateClass}>
            Coordinate samples exist, but they do not look like usable latitude/longitude
            values yet. This likely means the parser still needs coordinate normalization.
          </p>
        ) : (
          <p className={emptyStateClass}>
            This activity does not currently have enough GPS samples to draw a route map.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
