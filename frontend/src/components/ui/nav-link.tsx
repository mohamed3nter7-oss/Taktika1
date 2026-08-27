"use client";

import type { LucideIcon } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

import { Icon } from "./icon";

export type NavLinkVariant = "top" | "rail" | "icon";

export type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: NavLinkVariant;
};

/**
 * A route-aware navigation link.
 *
 * The only client boundary in the shell. `TopNav` and `LeftRail` stay Server
 * Components and this leaf reads the pathname, which is the same "push the
 * directive as far down as it goes" move as `ProfileActions` in the header.
 *
 * Nothing can be active yet - every destination is a planned route that does
 * not exist - but the treatment is built now so it works the day one lands
 * rather than being discovered untested at that point.
 */
export function NavLink({ href, label, icon, variant = "top" }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "rail") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-body text-start",
          "transition-colors duration-fast ease-in-out",
          active
            ? "bg-accent-subtle text-accent-text"
            : "text-fg-secondary hover:bg-raised hover:text-fg",
        )}
      >
        <Icon icon={icon} size={18} />
        {label}
      </Link>
    );
  }

  if (variant === "icon") {
    return (
      <Link
        href={href}
        aria-label={label}
        title={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
          "transition-colors duration-fast ease-in-out",
          active
            ? "text-accent-text"
            : "text-fg-secondary hover:bg-raised hover:text-fg",
        )}
      >
        <Icon icon={icon} size={20} />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full min-w-18 flex-col items-center justify-center gap-0.5 px-3 text-xs",
        "transition-colors duration-fast ease-in-out",
        active ? "text-accent-text" : "text-fg-secondary hover:text-fg",
      )}
    >
      <Icon icon={icon} size={20} />
      {label}
      {/* The reference offsets this rule 12px below the item, which assumes a
          fixed item height. Filling the bar instead puts it on the bottom
          border at any height, and enlarges the target. */}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
        />
      ) : null}
    </Link>
  );
}
