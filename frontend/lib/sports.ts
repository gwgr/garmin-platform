export type SportTone =
  | "running"
  | "cycling"
  | "swimming"
  | "hiking"
  | "strength"
  | "default";

export type SportMeta = {
  key: string;
  label: string;
  tone: SportTone;
};

export function formatSportLabel(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getSportMeta(value: string): SportMeta {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  const label = formatSportLabel(normalized);

  switch (normalized) {
    case "running":
    case "trail_running":
    case "track_running":
      return { key: normalized, label, tone: "running" };
    case "cycling":
    case "gravel_cycling":
    case "road_biking":
    case "indoor_cycling":
    case "mountain_biking":
      return { key: normalized, label, tone: "cycling" };
    case "swimming":
    case "lap_swimming":
    case "open_water_swimming":
      return { key: normalized, label, tone: "swimming" };
    case "hiking":
    case "walking":
    case "trail_hiking":
      return { key: normalized, label, tone: "hiking" };
    case "strength_training":
    case "strength":
    case "workout":
      return { key: normalized, label, tone: "strength" };
    default:
      return { key: normalized, label, tone: "default" };
  }
}
