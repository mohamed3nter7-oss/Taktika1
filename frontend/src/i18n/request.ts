import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Fixed so server-rendered relative times are deterministic. See mocks/player-profile.ts.
    timeZone: "Africa/Cairo",
    formats: {
      number: {
        // Grouped and never abbreviated - a scout comparing profiles needs the
        // real value. Latin digits in both locales: the same run of numerals
        // has to be comparable across a page that mixes scripts.
        grouped: { numberingSystem: "latn", useGrouping: true },
        plain: { numberingSystem: "latn", useGrouping: false },
      },
      dateTime: {
        monthYear: { month: "short", year: "numeric", numberingSystem: "latn" },
        dayMonthYear: {
          day: "numeric",
          month: "short",
          year: "numeric",
          numberingSystem: "latn",
        },
      },
    },
  };
});
