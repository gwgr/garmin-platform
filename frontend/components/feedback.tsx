import type { ReactNode } from "react";

import { cn, emptyStateClass, panelContentClass, panelLabelClass, subtleClass, warningClass } from "../lib/ui";
import { Card, CardContent } from "./ui/card";

type StateTone = "neutral" | "warning" | "error";

type StatePanelProps = {
  title: string;
  message: ReactNode;
  detail?: ReactNode;
  tone?: StateTone;
};

const toneClassName: Record<StateTone, string> = {
  neutral: "border-[color:var(--line)] bg-[var(--paper)]",
  warning: "border-[rgba(210,140,27,0.28)] bg-[rgba(255,248,233,0.94)]",
  error: "border-[rgba(190,62,45,0.24)] bg-[rgba(255,243,240,0.95)]",
};

function messageClassName(tone: StateTone): string {
  switch (tone) {
    case "error":
      return warningClass;
    case "warning":
      return "m-0 font-medium leading-7 text-[#9a6416]";
    default:
      return emptyStateClass;
  }
}

export function StatePanel({
  title,
  message,
  detail,
  tone = "neutral",
}: StatePanelProps) {
  return (
    <Card className={cn(toneClassName[tone])}>
      <CardContent className={panelContentClass}>
        <span className={panelLabelClass}>{title}</span>
        <p className={messageClassName(tone)}>{message}</p>
        {detail ? <div className={subtleClass}>{detail}</div> : null}
      </CardContent>
    </Card>
  );
}

type InlineNoticeProps = {
  title: string;
  detail: ReactNode;
  tone?: StateTone;
};

export function InlineNotice({ title, detail, tone = "neutral" }: InlineNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-3 sm:px-5",
        toneClassName[tone],
      )}
    >
      <p className={cn("m-0 text-sm font-semibold", tone === "error" ? "text-[#9a4528]" : "text-[var(--text)]")}>
        {title}
      </p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

type InlineStateProps = {
  title: string;
  message: ReactNode;
  detail?: ReactNode;
  tone?: StateTone;
};

export function InlineState({
  title,
  message,
  detail,
  tone = "neutral",
}: InlineStateProps) {
  return (
    <div
      className={cn(
        "mt-4 rounded-[18px] border px-4 py-4 sm:px-5",
        toneClassName[tone],
      )}
    >
      <span className={panelLabelClass}>{title}</span>
      <p className={messageClassName(tone)}>{message}</p>
      {detail ? <div className={subtleClass}>{detail}</div> : null}
    </div>
  );
}

type PageLoadingStateProps = {
  title?: string;
  description?: string;
};

export function PageLoadingState({
  title = "Loading page",
  description = "Fetching the latest Garmin data and assembling the current view.",
}: PageLoadingStateProps) {
  return (
    <main className="mx-auto grid w-full max-w-[1120px] gap-7 lg:gap-8">
      <section className="grid gap-5">
        <div className="grid gap-4">
          <span className="text-[0.76rem] uppercase tracking-[0.16em] text-[var(--muted)]">Loading</span>
          <div className="max-w-[56rem]">
            <h1 className="m-0 [font-family:var(--font-display-sans)] text-[clamp(1.85rem,3vw,2.45rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--text)]">
              {title}
            </h1>
            <p className="mt-4 text-[0.98rem] leading-[1.7] text-[var(--muted)]">{description}</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="min-h-[16rem] animate-pulse rounded-[24px] border border-[color:var(--line)] bg-white/45"
              key={index}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
