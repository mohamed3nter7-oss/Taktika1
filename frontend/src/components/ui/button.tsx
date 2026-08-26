import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Icon, type IconSize } from "./icon";

/**
 * At most one filled accent button per view.
 *
 * There is no `danger` variant. Nothing on this page destroys anything, and
 * the design system's own hover and pressed values for it are ad-hoc hexes
 * with no tokens behind them - when a destructive action arrives, they should
 * be derived from `--color-danger` the way the accent derives its own. D-016.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed",
  secondary:
    "border-edge-strong bg-transparent text-fg hover:bg-raised",
  ghost:
    "border-transparent bg-transparent text-fg-secondary hover:bg-raised hover:text-fg",
  link: "border-transparent bg-transparent text-accent-text hover:underline hover:text-accent-text-hover",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-body",
  lg: "h-12 px-6 text-body",
};

const SIZE_ICON: Record<ButtonSize, IconSize> = { sm: 16, md: 18, lg: 20 };

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: LucideIcon;
  iconEnd?: LucideIcon;
  /** Mirrors both icons under RTL. Set it for arrows and chevrons. */
  mirrorIcons?: boolean;
  fullWidth?: boolean;
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  iconStart,
  iconEnd,
  mirrorIcons = false,
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const link = variant === "link";

  return (
    <button
      type={type}
      className={cn(
        "items-center justify-center gap-2 border font-medium leading-none whitespace-nowrap",
        "transition-[color,background-color,border-color,transform] duration-fast ease-in-out",
        // The only press treatment in the system. Nothing else moves.
        "active:scale-98",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-sunken disabled:text-fg-muted",
        fullWidth ? "flex w-full" : "inline-flex",
        link ? "h-auto rounded-none p-0 text-sm" : cn("rounded-md", SIZE[size]),
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {iconStart ? (
        <Icon icon={iconStart} size={SIZE_ICON[size]} mirror={mirrorIcons} />
      ) : null}
      <span>{children}</span>
      {iconEnd ? (
        <Icon icon={iconEnd} size={SIZE_ICON[size]} mirror={mirrorIcons} />
      ) : null}
    </button>
  );
}
