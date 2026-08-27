"use client";

/**
 * Client, and for a concrete reason rather than convenience.
 *
 * A Lucide icon is a function component, and function components cannot be
 * passed as props from a Server Component to a Client Component - React
 * rejects it at runtime with "Functions cannot be passed directly to Client
 * Components". Since the links have to be route-aware (`usePathname`), the
 * boundary lands here and the icons stay on this side of it.
 *
 * Note this did NOT fail the production build: the profile route is dynamic,
 * so nothing rendered the shell at build time. Only the running server showed
 * it.
 */

import { Bookmark, House, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";

/**
 * The 240px navigation rail.
 *
 * Four links and nothing else. The reference also carries a viewer summary
 * card, a clubs list, "Saved profiles" and "Shortlists"; none of those are on
 * the roadmap, and a nav link is a product promise. See D-017.
 *
 * Hidden below `tablet`, where the reference replaces it with a bottom tab
 * bar. That tab bar is a separate task and is deliberately NOT stubbed here -
 * a stub would be the dead target this rail was trimmed to avoid.
 */
export function LeftRail() {
  const t = useTranslations("nav");

  return (
    <aside className="hidden w-60 shrink-0 tablet:block tablet:sticky tablet:top-22 tablet:self-start">
      <Card padding="none">
        {/* The reference pads this card at 8px, which is not one of the nine
            layout steps; the padding is supplied here rather than adding a
            fourth Card variant for one call site. */}
        <nav aria-label={t("secondary")} className="grid gap-0.5 p-2">
          <NavLink variant="rail" href="/feed" label={t("feed")} icon={House} />
          <NavLink
            variant="rail"
            href="/network"
            label={t("network")}
            icon={Users}
          />
          <NavLink
            variant="rail"
            href="/saved"
            label={t("savedPosts")}
            icon={Bookmark}
          />
          <NavLink
            variant="rail"
            href="/messages"
            label={t("messages")}
            icon={Send}
          />
        </nav>
      </Card>
    </aside>
  );
}
