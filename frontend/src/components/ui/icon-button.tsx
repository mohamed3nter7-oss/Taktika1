import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";
import { Icon, type IconSize } from "./icon";

const SIZE: Record<"sm" | "md" | "lg", { box: string; icon: IconSize }> = {
  sm: { box: "size-8", icon: 16 },
  md: { box: "size-10", icon: 20 },
  lg: { box: "size-11", icon: 24 },
};

export type IconButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "aria-label"
> & {
  icon: LucideIcon;
  /** Required. An unlabelled icon control is a guess, so this is a type error. */
  label: string;
  size?: keyof typeof SIZE;
  active?: boolean;
};

export function IconButton({
  icon,
  label,
  size = "md",
  active = false,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const s = SIZE[size];

  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0",
        "transition-[color,background-color,transform] duration-fast ease-in-out",
        "active:scale-98 hover:bg-raised",
        "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-muted",
        s.box,
        active ? "text-accent-text" : "text-fg-secondary hover:text-fg",
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={s.icon} />
    </button>
  );
}
