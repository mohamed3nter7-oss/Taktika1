/**
 * Formatting helpers with no locale knowledge of their own.
 *
 * Anything that varies by language goes through next-intl's formatter at the
 * call site; these are the pure decisions around it - which branch to take,
 * what the fallback glyph is, where a string gets cut.
 */

/**
 * Body length past which `PostCard` clamps to four lines and offers "Show
 * more". Posts run to 3000 characters, so most long ones cross this.
 */
export const POST_CLAMP_CHARS = 220;

/** A post older than this shows an absolute date instead of "2 hours ago". */
export const RELATIVE_TIME_CUTOFF_MS = 7 * 24 * 60 * 60 * 1000;

/** First and last initial. The avatar fallback, never a grey silhouette. */
export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toLocaleUpperCase("en");
}

/** Up to two leading letters. The club crest fallback. */
export function crestInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toLocaleUpperCase("en");
}

export function isBeforeCutoff(iso: string, now: Date): boolean {
  return now.getTime() - new Date(iso).getTime() >= RELATIVE_TIME_CUTOFF_MS;
}

/** Strip the scheme so a portfolio URL reads as a destination, not a link. */
export function bareUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export type RelativeTime =
  | { unit: "minutes" | "hours" | "days"; value: number }
  | { unit: "absolute" };

/**
 * Which relative-time branch a timestamp falls into.
 *
 * Deliberately not `Intl.RelativeTimeFormat`: that yields "3 days ago" where
 * the design system specifies the compact "3d ago", and it renders its digits
 * in the locale's own numbering system, which would put Arabic-Indic numerals
 * in Arabic timestamps while every other number on the page is Latin. The
 * caller formats `value` and picks the message; this only decides the branch.
 */
export function relativeTime(iso: string, now: Date): RelativeTime {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return { unit: "minutes", value: Math.max(1, minutes) };
  if (minutes < 1440) return { unit: "hours", value: Math.round(minutes / 60) };
  const days = Math.round(minutes / 1440);
  if (days < 7) return { unit: "days", value: days };
  return { unit: "absolute" };
}
