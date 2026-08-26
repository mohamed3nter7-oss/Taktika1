import { useTranslations } from "next-intl";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { ROLE_CONFIG } from "@/lib/role-config";
import type { UserRole } from "@/types/player-profile";

/**
 * The only component permitted to use role colours.
 *
 * Colour arrives through `data-role` and the cascade, not through a prop, so
 * adding a role is a CSS entry plus a config entry and nothing else.
 *
 * The glyph is never the only carrier of meaning: `full` pairs it with the
 * role name, and `compact` carries the name as its accessible label.
 */
export function RoleBadge({
  role,
  variant = "full",
}: {
  role: UserRole;
  variant?: "full" | "compact";
}) {
  const t = useTranslations("roles");
  const label = t(role);
  const compact = variant === "compact";

  return (
    <span
      data-role={role}
      role={compact ? "img" : undefined}
      aria-label={compact ? label : undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-role-border bg-role-bg text-xs font-medium whitespace-nowrap text-role-text",
        compact ? "size-full" : "gap-1 px-2.5 py-1",
      )}
    >
      <Icon icon={ROLE_CONFIG[role].icon} size={14} />
      {compact ? null : label}
    </span>
  );
}
