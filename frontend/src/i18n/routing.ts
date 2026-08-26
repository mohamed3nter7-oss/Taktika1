import { defineRouting } from "next-intl/routing";

/**
 * English is unprefixed (`/profile/x`), Arabic is prefixed (`/ar/profile/x`).
 * Both are first-class; `en` is default only in the sense of carrying no prefix.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** RTL is structural. Everything downstream reads direction from here, never from a locale check. */
export function directionOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
