import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { directionOf, routing, type Locale } from "@/i18n/routing";

import "../globals.css";

/**
 * The design system specifies self-hosted woff2 via `next/font/local` with
 * per-script subsetting. No font binaries were provided, so these come from
 * `next/font/google`, which self-hosts at build time - same outcome, minus the
 * manual subsetting, and no CDN request at runtime. See D-014.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });

  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={directionOf(locale as Locale)}
      className={`${inter.variable} ${cairo.variable} h-full`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
