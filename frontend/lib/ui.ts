export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const shellClass =
  "mx-auto w-full max-w-[1120px] px-4 pb-18 pt-14 sm:px-6 lg:px-8";
export const sectionClass = "mb-7";
export const sectionHeaderClass = "mb-[18px]";
export const sectionHeaderRowClass =
  "mb-[18px] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
export const sectionTitleClass =
  "m-0 [font-family:var(--font-display-sans)] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--text)]";
export const pageTitleClass =
  "m-0 [font-family:var(--font-display-sans)] text-[clamp(2.6rem,5vw,4.4rem)] font-semibold leading-[0.96] tracking-[-0.03em] text-[var(--text)]";
export const panelClass =
  "rounded-[24px] border border-[color:var(--line)] bg-[var(--paper)] p-[22px] shadow-[var(--shadow)] backdrop-blur-md";
export const compactPanelClass =
  "rounded-[24px] border border-[color:var(--line)] bg-[var(--paper)] px-[22px] py-[18px] shadow-[var(--shadow)] backdrop-blur-md";
export const panelLabelClass =
  "mb-3 block text-[0.76rem] uppercase tracking-[0.16em] text-[var(--muted)]";
export const textLinkClass =
  "font-semibold text-[var(--accent)] decoration-transparent underline-offset-4 transition hover:underline";
export const cardLinkClass =
  "font-semibold text-inherit decoration-transparent underline-offset-4 transition hover:underline";
export const listTitleClass = "m-0 text-base font-semibold text-[var(--text)]";
export const listMetaClass = "m-0 text-sm leading-6 text-[var(--muted)]";
export const listStackClass = "grid gap-3";
export const listRowClass =
  "flex flex-col gap-3 border-t border-[color:var(--line)] py-[14px] first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-[18px]";
export const listValuesClass =
  "flex flex-col gap-1 text-left text-[var(--muted)] sm:items-end sm:text-right";
export const emptyStateClass = "m-0 leading-7 text-[var(--muted)]";
export const warningClass = "m-0 font-semibold leading-7 text-[#9a4528]";
export const subtleClass = "mt-3.5 text-[var(--muted)]";
export const statValueClass =
  "m-0 [font-family:var(--font-metric-serif)] text-[clamp(2rem,5vw,3.4rem)] leading-[0.95] text-[var(--text)]";
export const metricLabelClass =
  "text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]";
export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-transparent bg-[var(--accent)] px-4 text-sm font-bold text-[#f7f7f2]";
export const ghostButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/45 px-4 text-sm font-bold text-[var(--text)]";
export const disabledButtonClass = "pointer-events-none opacity-50";
export const fourUpGridClass = "grid gap-[18px] md:grid-cols-2 xl:grid-cols-4";
export const splitGridClass = "grid gap-[18px] xl:grid-cols-2";
export const chartGridClass = "grid gap-[18px] xl:grid-cols-3";
export const filterGridClass = "grid gap-[14px] md:grid-cols-3";
export const detailMetaGridClass = "grid gap-[18px] md:grid-cols-2";
export const statusDotClass = "inline-block h-3.5 w-3.5 rounded-full";
