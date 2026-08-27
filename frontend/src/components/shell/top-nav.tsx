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

import { Bell, House, Search, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { NavLink } from "@/components/ui/nav-link";
import { Link } from "@/i18n/navigation";
import type { Viewer } from "@/types/viewer";

/**
 * Presentational search.
 *
 * It renders, it types, and it does nothing else - there is no `search`
 * module and no results to show. Deliberately not wrapped in a form, so
 * Enter cannot look like it submitted something.
 *
 * The reference caps this at `32vw`, which is an arbitrary value; `flex-1
 * min-w-0 max-w-80` produces the same "does not dominate the bar" behaviour
 * out of tokens.
 */
function SearchField() {
  const t = useTranslations("nav");

  return (
    <div role="search" className="relative flex min-w-0 flex-1 items-center">
      <Icon
        icon={Search}
        size={16}
        className="pointer-events-none absolute start-3 text-fg-muted"
      />
      <input
        type="search"
        aria-label={t("search")}
        placeholder={t("searchPlaceholder")}
        className="h-9 w-full max-w-80 rounded-md border border-edge bg-sunken ps-8 pe-3 text-sm text-fg text-start placeholder:text-fg-muted focus:border-accent"
      />
    </div>
  );
}

/**
 * The 64px application bar.
 *
 * Every nav destination is a planned route that does not exist yet, so they
 * are dead links rather than absent: the bar is the product's shape, and
 * leaving holes in it teaches the wrong map. What is NOT here is the
 * notification count - a hardcoded number in every screenshot is a claim the
 * product cannot support. See D-017.
 */
export function TopNav({ viewer }: { viewer: Viewer }) {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-nav flex h-16 items-center gap-6 border-b border-edge bg-raised px-6">
      <Link
        href="/"
        aria-label={t("home")}
        className="shrink-0 text-h3 tracking-tight text-fg no-underline hover:text-fg"
      >
        Taktika<span className="text-accent-text">.</span>
      </Link>

      <SearchField />

      <nav
        aria-label={t("primary")}
        className="ms-auto flex h-full items-center gap-2"
      >
        <NavLink href="/feed" label={t("feed")} icon={House} />
        <NavLink href="/network" label={t("network")} icon={Users} />
        <NavLink href="/messages" label={t("messages")} icon={Send} />
      </nav>

      <NavLink
        href="/notifications"
        label={t("notifications")}
        icon={Bell}
        variant="icon"
      />

      {/* Identity, not a control: there is no route for "my profile" yet, and a
          dead target beside live navigation reads as broken rather than
          unfinished. The avatar is decorative; the label carries the meaning. */}
      <span className="ms-3 flex shrink-0 items-center">
        <span aria-hidden="true">
          <Avatar src={viewer.avatarUrl} name={viewer.fullName} size="sm" />
        </span>
        <span className="sr-only">
          {t("signedInAs", { name: viewer.fullName })}
        </span>
      </span>
    </header>
  );
}
