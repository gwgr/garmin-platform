import type { ReactNode } from "react";

import { cn, pageDescriptionClass, pageTitleClass, sectionHeaderRowClass, shellClass } from "../lib/ui";

type PageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  titleClassName?: string;
};

export function PageShell({
  title,
  description,
  actions,
  children,
  eyebrow,
  titleClassName,
}: PageShellProps) {
  return (
    <main className={shellClass}>
      <header className="grid gap-4">
        {eyebrow ? (
          <span className="text-[0.76rem] uppercase tracking-[0.16em] text-[var(--muted)]">
            {eyebrow}
          </span>
        ) : null}

        <div className={sectionHeaderRowClass}>
          <div className="max-w-[56rem]">
            <h1 className={cn(pageTitleClass, titleClassName)}>{title}</h1>
            {description ? (
              <div className={cn("mt-4", pageDescriptionClass)}>
                {description}
              </div>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      </header>

      {children}
    </main>
  );
}
