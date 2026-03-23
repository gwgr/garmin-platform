"use client";

import { useEffect, useState } from "react";

function isDateOnlyValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate);
}

function formatLocalDate(value: string): string {
  if (isDateOnlyValue(value)) {
    return formatDateOnly(value);
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLocalDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFallbackDate(value: string): string {
  if (isDateOnlyValue(value)) {
    return formatDateOnly(value);
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatFallbackDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function LocalDate({ value }: { value: string }) {
  const [formatted, setFormatted] = useState(() => formatFallbackDate(value));

  useEffect(() => {
    setFormatted(formatLocalDate(value));
  }, [value]);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {formatted}
    </time>
  );
}

export function LocalDateTime({ value }: { value: string }) {
  const [formatted, setFormatted] = useState(() => formatFallbackDateTime(value));

  useEffect(() => {
    setFormatted(formatLocalDateTime(value));
  }, [value]);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
