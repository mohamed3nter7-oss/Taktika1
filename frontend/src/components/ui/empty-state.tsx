import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "./icon";

/**
 * An invitation, never an apology: name the space, one line of explanation,
 * one action. "Nothing here yet" with no path forward is the failure mode.
 *
 * `action` is optional because a visitor looking at someone else's empty tab
 * has no action to take - offering one there would be a dead control.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Icon icon={icon} size={48} className="text-fg-muted" />
      <p className="text-h3">{title}</p>
      {description ? (
        <p className="max-w-80 text-body text-fg-secondary text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
