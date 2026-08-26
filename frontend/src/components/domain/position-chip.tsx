import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { POSITION_CODES } from "@/lib/role-config";
import type { PlayerPosition } from "@/types/player-profile";

/**
 * A football position code.
 *
 * Codes stay Latin in both languages by product decision, so every one is
 * wrapped `dir="ltr"` and bidi-isolated here rather than at the call site -
 * the isolation is the component's job precisely because forgetting it at one
 * call site is invisible until someone reads the Arabic page.
 *
 * The code itself is meaningless to a screen reader, so the full position
 * name is the accessible label.
 */
export function PositionChip({
  position,
  variant = "secondary",
}: {
  position: PlayerPosition;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("positions");
  const name = t(position);

  return (
    <span
      dir="ltr"
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "bidi-isolate inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-2 font-numeric text-xs font-medium tabular-nums",
        variant === "primary"
          ? "bg-accent-subtle text-accent-text"
          : "bg-sunken text-fg",
      )}
    >
      {POSITION_CODES[position]}
    </span>
  );
}
