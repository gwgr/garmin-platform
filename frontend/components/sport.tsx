import { getSportMeta } from "../lib/sports";

type SportIconProps = {
  sport: string;
};

type SportLabelProps = {
  sport: string;
  className?: string;
};

type SportBadgeProps = {
  sport: string;
  className?: string;
};

function joinClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function SportGlyph({ sport }: SportIconProps) {
  const meta = getSportMeta(sport);

  switch (meta.tone) {
    case "running":
      return (
        <svg aria-hidden="true" className="sport-glyph" viewBox="0 0 24 24">
          <circle cx="15.5" cy="4.5" r="2.4" fill="currentColor" />
          <path
            d="M10 8.2 13.8 7l2 1.8c.9.8 2.1 1.3 3.3 1.3h.9v2h-1.2c-1.7 0-3.4-.6-4.7-1.8l-1 3.3 2.6 2.4c.8.7 1.3 1.8 1.4 2.9l.2 2.1h-2.3l-.2-1.8a2.9 2.9 0 0 0-.9-1.8l-2.9-2.6-1.6 5.3H7l2.3-7.4 1.5-4.8-.3-.7-2.4 2.1H5.7v-2h1.6c.8 0 1.6-.3 2.2-.9L10 8.2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "cycling":
      return (
        <svg aria-hidden="true" className="sport-glyph" viewBox="0 0 24 24">
          <circle cx="6.5" cy="17.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.6" cy="17.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="13.4" cy="5" r="1.8" fill="currentColor" />
          <path
            d="m10.8 7.2 2.6 3.6h3.8v1.9h-4.7l-2.1-2.8-1.8 2.2 2 5.3h-2.1l-1.7-4.4H6.5v-1.8h2.9l2.1-2.6-.8-1.4h-2V5.4h3.2c.8 0 1.5.4 1.9 1l.4.8Z"
            fill="currentColor"
          />
          <path d="m14.4 10.8 2 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "swimming":
      return (
        <svg aria-hidden="true" className="sport-glyph" viewBox="0 0 24 24">
          <circle cx="14.8" cy="6" r="2" fill="currentColor" />
          <path
            d="M9.8 10.3c1.4-1.2 2.7-2.3 4.8-2.3 1.3 0 2.5.5 3.6 1.4l-1.2 1.5c-.7-.6-1.5-.9-2.4-.9-1.4 0-2.2.6-3.4 1.6l-.6.5L9.8 10.3Z"
            fill="currentColor"
          />
          <path
            d="M2.5 15.2c1.2 0 1.8.5 2.4 1 .5.4.9.7 1.8.7.9 0 1.4-.3 1.8-.7.6-.5 1.3-1 2.5-1s1.9.5 2.5 1c.4.4.9.7 1.8.7.9 0 1.3-.3 1.8-.7.6-.5 1.3-1 2.5-1v2c-.5 0-.8.2-1.3.5-.6.5-1.4 1.2-3 1.2-1.5 0-2.3-.7-3-1.2-.4-.3-.7-.5-1.3-.5s-.9.2-1.3.5c-.7.5-1.5 1.2-3 1.2s-2.3-.7-3-1.2c-.4-.3-.7-.5-1.3-.5v-2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "hiking":
      return (
        <svg aria-hidden="true" className="sport-glyph" viewBox="0 0 24 24">
          <circle cx="14.2" cy="4.6" r="2.3" fill="currentColor" />
          <path
            d="m12.4 8 1.9 2.6 2.2 1.2-.9 1.7-2.7-1.4-1.2-1.6-1.5 3 1.9 2.2c.7.8 1 1.9.9 3l-.1 2.1h-2l.1-1.8c0-.6-.1-1.1-.5-1.5l-2.2-2.5-1.2 2.6H4.7l2.6-5.8L9.8 8h2.6Z"
            fill="currentColor"
          />
          <path d="M17.5 9.5 19 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "strength":
      return (
        <svg aria-hidden="true" className="sport-glyph" viewBox="0 0 24 24">
          <path
            d="M2.5 9.5h2v5h-2v-5Zm3.2-2.1h2.1v9.2H5.7V7.4Zm10.5 0h2.1v9.2h-2.1V7.4Zm3.3 2.1h2v5h-2v-5ZM7.1 10.5h9.8v3H7.1v-3Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className="sport-glyph" viewBox="0 0 24 24">
          <path
            d="m12 2.5 2.9 5.9 6.6 1-4.8 4.7 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.8-4.7 6.6-1L12 2.5Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

export function SportLabel({ sport, className }: SportLabelProps) {
  const meta = getSportMeta(sport);

  return (
    <span className={joinClasses("sport-label", `sport-tone-${meta.tone}`, className)}>
      <span className="sport-icon-shell">
        <SportGlyph sport={sport} />
      </span>
      <span>{meta.label}</span>
    </span>
  );
}

export function SportBadge({ sport, className }: SportBadgeProps) {
  const meta = getSportMeta(sport);

  return (
    <span className={joinClasses("sport-badge", `sport-tone-${meta.tone}`, className)}>
      <span className="sport-icon-shell">
        <SportGlyph sport={sport} />
      </span>
      <span>{meta.label}</span>
    </span>
  );
}
