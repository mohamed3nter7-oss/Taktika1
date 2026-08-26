import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type CardPadding = "default" | "compact" | "none";

const PADDING: Record<CardPadding, string> = {
  default: "p-5",
  compact: "p-4",
  none: "",
};

export type CardProps = {
  children: ReactNode;
  padding?: CardPadding;
  /**
   * Adds a hover response. Leave it off for a card nothing clicks: a hover
   * state on a non-clickable surface is a false affordance.
   */
  interactive?: boolean;
  as?: "div" | "section" | "article" | "li";
  className?: string;
};

/**
 * The default content plane: raised surface, one hairline, 12px radius, 20px
 * padding, no shadow. There is no shadow system - elevation is lightness.
 *
 * A Card is never nested in a Card; internal structure uses `CardDivider`.
 */
export function Card({
  children,
  padding = "default",
  interactive = false,
  as: Tag = "div",
  className,
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-edge bg-raised",
        PADDING[padding],
        interactive &&
          "cursor-pointer transition-colors duration-fast ease-in-out hover:border-edge-strong",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A subtle rule that bleeds to the card edges. Use instead of a second Card. */
export function CardDivider({
  inset = "default",
}: {
  inset?: Exclude<CardPadding, "none">;
}) {
  return (
    <div
      role="presentation"
      className={cn(
        "h-px bg-edge-subtle",
        inset === "default" ? "-mx-5" : "-mx-4",
      )}
    />
  );
}
