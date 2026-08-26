import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info";

const VARIANT: Record<BadgeVariant, string> = {
  neutral: "bg-sunken text-fg-secondary",
  success: "bg-success-tint text-success-text",
  danger: "bg-danger-tint text-danger-text",
  warning: "bg-warning-tint text-warning-text",
  info: "bg-info-tint text-info-text",
};

/**
 * A generic status label - Verified, Current, Open to trials.
 *
 * It takes a variant, never a role: role colours are legal in `RoleBadge` and
 * nowhere else.
 *
 * The 2px vertical padding is a half-step on the 4px unit rather than one of
 * the nine layout steps. Rounding it up to 4px makes the badge visibly chunky
 * against 12px text; the grid governs the space between things, not the
 * internals of a small component. See D-015.
 */
export function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        VARIANT[variant],
      )}
    >
      {children}
    </span>
  );
}
