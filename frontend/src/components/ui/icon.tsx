import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Icon sizes track the type they sit beside: 12 in badges, 14 in role badges
 * and inline markers, 16 with 13px text, 18 with 15px text, 20 in icon
 * buttons, 24 in touch targets, 48 in empty states.
 */
export type IconSize = 12 | 14 | 16 | 18 | 20 | 24 | 48;

const SIZE_CLASS: Record<IconSize, string> = {
  12: "size-3",
  14: "size-3.5",
  16: "size-4",
  18: "size-4.5",
  20: "size-5",
  24: "size-6",
  48: "size-12",
};

export type IconProps = {
  icon: LucideIcon;
  size?: IconSize;
  /**
   * Accessible name. Provide it only when the icon is the sole carrier of
   * meaning; an icon sitting beside its own text label must stay hidden, or a
   * screen reader announces the label twice.
   */
  label?: string;
  /**
   * Mirrors the glyph under RTL. Set it on chevrons, back and forward arrows,
   * progress indicators and drawer directions. Leave it off for media
   * controls, crests, checkmarks and external-link glyphs, which do not
   * mirror.
   */
  mirror?: boolean;
  className?: string;
};

/**
 * The only place the icon size scale and `currentColor` are enforced.
 *
 * An icon is never the only carrier of meaning: every role badge pairs its
 * glyph with a text label, and every icon-only control carries an aria-label.
 */
export function Icon({
  icon: Glyph,
  size = 18,
  label,
  mirror = false,
  className,
}: IconProps) {
  return (
    <Glyph
      size={size}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn(
        "shrink-0",
        SIZE_CLASS[size],
        mirror && "rtl:-scale-x-100",
        className,
      )}
    />
  );
}
