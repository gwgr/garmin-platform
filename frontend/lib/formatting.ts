export function formatDistance(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function formatPaceMinutesPerKilometer(minutesPerKilometer: number): string {
  if (!Number.isFinite(minutesPerKilometer) || minutesPerKilometer <= 0) {
    return "--";
  }

  const totalSeconds = Math.round(minutesPerKilometer * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

export function formatPaceMinutesPer100Meters(minutesPer100Meters: number): string {
  if (!Number.isFinite(minutesPer100Meters) || minutesPer100Meters <= 0) {
    return "--";
  }

  const totalSeconds = Math.round(minutesPer100Meters * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} /100m`;
}

export function formatSpeedKilometersPerHour(speedKph: number): string {
  if (!Number.isFinite(speedKph) || speedKph <= 0) {
    return "--";
  }

  return `${speedKph.toFixed(1)} km/h`;
}

export function formatDuration(durationSeconds: number): string {
  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatElapsedLabel(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return "--";
  }

  const totalSeconds = Math.round(durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDateLabel(value: string): string {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
