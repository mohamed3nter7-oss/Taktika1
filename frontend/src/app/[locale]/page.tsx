import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { FIXTURE_IDS } from "@/mocks/player-profile";

/**
 * Development index.
 *
 * Eight URLs verified by hand-typing is how a verification pass gets skipped.
 * Temporary - this route goes when the real feed lands.
 */
export default async function DevIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dev");

  return (
    <main className="mx-auto grid max-w-page gap-6 px-6 py-12">
      <div className="grid gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-bio text-body text-fg-secondary text-pretty">
          {t("description")}
        </p>
      </div>

      <ul className="grid gap-4">
        {FIXTURE_IDS.map((id) => (
          <li key={id}>
            <Card interactive as="div">
              <Link
                href={`/profile/${id}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="grid gap-1">
                  <span className="text-body-lg font-medium text-fg">
                    {t(id)}
                  </span>
                  <span className="text-sm text-fg-secondary">
                    {t(`${id}Hint`)}
                  </span>
                </span>
                <Icon icon={ArrowRight} mirror className="text-fg-muted" />
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
