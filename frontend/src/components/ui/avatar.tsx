import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { personInitials } from "@/lib/format";

import type { IconSize } from "./icon";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Initials sizes are snapped to the type scale rather than copied from the
 * design system, which uses 10 and 18 - neither of which is a token. The
 * nearest scale steps read identically at these box sizes.
 */
const SIZE: Record<
  AvatarSize,
  {
    box: string;
    px: number;
    text: string;
    badge: string | null;
    glyph: IconSize | null;
  }
> = {
  xs: { box: "size-6", px: 24, text: "text-xs", badge: null, glyph: null },
  sm: { box: "size-8", px: 32, text: "text-xs", badge: null, glyph: null },
  md: { box: "size-10", px: 40, text: "text-sm", badge: null, glyph: null },
  // Slot is 40% of the avatar, glyph 50% of the slot. lg's slot rounds up from
  // the specified 22.4px because 22 is off the 4px unit. See D-019.
  lg: { box: "size-14", px: 56, text: "text-h3", badge: "size-6", glyph: 12 },
  xl: {
    box: "size-30",
    px: 120,
    text: "text-display",
    badge: "size-12",
    glyph: 24,
  },
};

export type AvatarProps = {
  src: string | null;
  name: string;
  size?: AvatarSize;
  /**
   * Corner slot, honoured at `lg` and `xl` only.
   *
   * A render function rather than a node: the slot size is derived here, so
   * the glyph size has to be derived here too or the 50% rule ends up
   * duplicated at every call site. `ui/` still knows nothing about roles -
   * what goes in the corner remains the caller's business.
   */
  badge?: (glyphSize: IconSize) => ReactNode;
};

/**
 * A user image on a light plate, so the transparent PNGs people actually
 * upload never disappear into the dark surface.
 */
export function Avatar({ src, name, size = "md", badge }: AvatarProps) {
  const s = SIZE[size];
  // Resolved together so the glyph size is narrowed once rather than asserted
  // at the point of use.
  const corner =
    badge && s.badge !== null && s.glyph !== null
      ? { className: s.badge, node: badge(s.glyph) }
      : null;

  return (
    <span className={cn("relative inline-block shrink-0", s.box)}>
      <span
        className={cn(
          "flex size-full items-center justify-center overflow-hidden rounded-full border border-edge font-medium",
          src ? "bg-plate" : "bg-sunken text-fg-secondary",
          s.text,
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            width={s.px}
            height={s.px}
            className="size-full object-cover"
          />
        ) : (
          personInitials(name)
        )}
      </span>
      {corner ? (
        <span
          className={cn(
            "absolute bottom-0 end-0 flex items-center justify-center rounded-full ring-2 ring-raised",
            corner.className,
          )}
        >
          {corner.node}
        </span>
      ) : null}
    </span>
  );
}
