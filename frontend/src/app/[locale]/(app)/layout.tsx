import { setRequestLocale } from "next-intl/server";

import { LeftRail } from "@/components/shell/left-rail";
import { TopNav } from "@/components/shell/top-nav";
import { MOCK_VIEWER } from "@/mocks/viewer";

/**
 * The application shell.
 *
 * This owns the page frame - container, gutters, vertical rhythm, and the gap
 * between the rail and the content - so a page underneath owns only its own
 * columns and knows nothing about what sits beside it.
 *
 * The arithmetic is exact and worth stating, because every column width in the
 * design depends on it: 1240 container − 48 gutters = 1192, which is
 * 240 rail + 24 gap + 928, and a page fills that 928 with 604 + 24 + 300.
 *
 * Route groups do not affect URLs, so `(app)` changes where files live and
 * nothing about what they serve.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <TopNav viewer={MOCK_VIEWER} />
      <div className="mx-auto flex w-full max-w-page gap-6 px-6 py-6 pb-16">
        <LeftRail />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
