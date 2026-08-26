import { ExternalLink } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Card, CardDivider } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { bareUrl } from "@/lib/format";
import { POSITION_CODES } from "@/lib/role-config";
import type { PlayerProfile } from "@/types/player-profile";

type Row = { key: string; label: string; value: string; ltr?: boolean };

/**
 * The one labelled surface.
 *
 * Header and rail are scan surfaces and carry facts without labels. This is
 * the reference view: every attribute the API holds, spelled out.
 *
 * An absent field is absent - no em dash, no "Not specified", no greyed row.
 * The grid reflows and the card gets shorter.
 */
export function AboutPanel({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations();
  const format = useFormatter();

  const positions = [profile.primaryPosition, profile.secondaryPosition]
    .filter((position) => position !== null)
    .map((position) => POSITION_CODES[position])
    .join(" · ");

  const rows: Row[] = [
    { key: "position", label: t("about.position"), value: positions, ltr: true },
    {
      key: "preferredFoot",
      label: t("about.preferredFoot"),
      value: t(`foot.${profile.preferredFoot}`),
    },
    {
      key: "leagueLevel",
      label: t("about.leagueLevel"),
      value: t(`league.${profile.leagueLevel}`),
    },
    {
      key: "age",
      label: t("about.age"),
      value: format.number(profile.age, "plain"),
    },
  ];

  if (profile.heightCm !== null) {
    rows.push({
      key: "height",
      label: t("about.height"),
      value: t("units.cm", { value: format.number(profile.heightCm, "plain") }),
    });
  }
  if (profile.weightKg !== null) {
    rows.push({
      key: "weight",
      label: t("about.weight"),
      value: t("units.kg", { value: format.number(profile.weightKg, "plain") }),
    });
  }
  if (profile.jerseyNumber !== null) {
    rows.push({
      key: "jerseyNumber",
      label: t("about.jerseyNumber"),
      value: format.number(profile.jerseyNumber, "plain"),
      ltr: true,
    });
  }
  rows.push({
    key: "basedIn",
    label: t("about.basedIn"),
    value: t("profile.location", {
      city: profile.city,
      country: profile.country,
    }),
  });

  return (
    <Card>
      <div className="grid gap-5">
        {profile.bio ? (
          <>
            <p className="max-w-bio text-body-lg text-pretty whitespace-pre-line">
              {profile.bio}
            </p>
            <CardDivider />
          </>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
          {rows.map((row) => (
            <div key={row.key} className="grid min-w-0 gap-0.5">
              <dt className="text-sm text-fg-secondary">{row.label}</dt>
              <dd
                dir={row.ltr ? "ltr" : undefined}
                className={
                  row.ltr
                    ? "bidi-isolate text-start font-numeric text-body font-medium tabular-nums"
                    : "text-body font-medium"
                }
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {profile.portfolioLink ? (
          <div className="grid gap-0.5">
            <span className="text-sm text-fg-secondary">
              {t("about.portfolio")}
            </span>
            <a
              href={profile.portfolioLink}
              dir="ltr"
              className="bidi-isolate inline-flex w-fit items-center gap-1 text-start text-body text-accent-text hover:text-accent-text-hover hover:underline"
            >
              {bareUrl(profile.portfolioLink)}
              <Icon icon={ExternalLink} size={14} />
            </a>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
