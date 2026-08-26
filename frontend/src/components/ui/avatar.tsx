import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { personInitials } from "@/lib/format";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Initials sizes are snapped to the type scale rather than copied from the
 * design system, which uses 10 and 18 - neither of which is a token. The
 * nearest scale steps read identically at these box sizes.
 */
const SIZE: Record<
  AvatarSize,
  { box: string; px: number; text: string; badge: string | null }
> = {
  xs: { box: "size-6", px: 24, text: "text-xs", badge: null },
  sm: { box: "size-8", px: 32, text: "text-xs", badge: null },
  md: { box: "size-10", px: 40, text: "text-sm", badge: null },
  lg: { box: "size-14", px: 56, text: "text-h3", badge: "size-6" },
  xl: { box: "size-30", px: 120, text: "text-display", badge: "size-12" },
};

export type AvatarProps = {
  src: string | null;
  name: string;
  size?: AvatarSize;
  /**
   * Corner slot, honoured at `lg` and `xl` only. `ui/` knows nothing about
   * roles, so what goes in the corner is the caller's business.
   */
  badge?: ReactNode;
};

/**
 * A user image on a light plate, so the transparent PNGs people actually
 * upload never disappear into the dark surface.
 */
export function Avatar({ src, name, size = "md", badge }: AvatarProps) {
  const s = SIZE[size];
  const slot = badge && s.badge ? s.badge : null;

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
      {slot ? (
        <span
          className={cn(
            "absolute bottom-0 end-0 flex items-center justify-center rounded-full ring-2 ring-raised",
            slot,
          )}
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}
