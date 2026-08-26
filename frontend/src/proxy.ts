import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  /**
   * The `\\.` matters. In a TypeScript string literal `"\."` is not an escape
   * sequence, so it collapses to a bare `.` — which in the lookahead matches
   * any character, making `.*.*` reject every path with a character in it.
   * The locale rewrite then never runs and `/profile/x` 404s against the
   * un-prefixed route while `/en/profile/x` works, which reads as a routing
   * bug rather than a quoting one.
   */
  matcher: [
    "/",
    "/(ar|en)/:path*",
    "/((?!_next|_vercel|api|mock|.*\\..*).*)",
  ],
};
