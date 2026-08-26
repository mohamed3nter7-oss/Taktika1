import { ExternalLink } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Card, CardDivider } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { PlayerProfile } from "@/types/player-profile";

/**
 * Height, weight and shirt number as one rail block, not three header items.
 *
 * They are reference numbers a scout checks after he is interested, not facts
 * he scans, and grouping them keeps three optional values out of the identity
 * block. One present value renders one row; none renders no block.
 *
 * The portfolio link lives here too: it is an attribute, not an action, and
 * putting it in the header would place a second competing target beside
 * Send message.
 */
export function PlayerDetailsCard({ profile }: { profile: PlayerProfile }) {
  const t = useTranslations();
  const format = useFormatter();

  const rows: Array<{ key: string; label: string; value: string }> = [];

  if (profile.heightCm !== null) {
    rows.push({
      key: "height",
      label: t("details.height"),
      value: t("units.cm", { value: format.number(profile.heightCm, "plain") }),
    });
  }
  if (profile.weightKg !== null) {
    rows.push({
      key: "weight",
      label: t("details.weight"),
      value: t("units.kg", { value: format.number(profile.weightKg, "plain") }),
    });
  }
  if (profile.jerseyNumber !== null) {
    rows.push({
      key: "jerseyNumber",
      label: t("details.jerseyNumber"),
      value: format.number(profile.jerseyNumber, "plain"),
    });
  }

  if (rows.length === 0 && !profile.portfolioLink) return null;

  return (
    <Card padding="compact" as="section">
      <div className="grid gap-3">
        <h2 className="text-xs tracking-overline text-fg-muted uppercase">
          {t("details.title")}
        </h2>

        {rows.length > 0 ? (
          <dl className="grid gap-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-sm text-fg-secondary">{row.label}</dt>
                <dd
                  dir="ltr"
                  className="bidi-isolate font-numeric text-sm font-medium tabular-nums"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {profile.portfolioLink ? (
          <>
            {rows.length > 0 ? <CardDivider inset="compact" /> : null}
            <a
              href={profile.portfolioLink}
              className="inline-flex w-fit items-center gap-1 text-sm text-accent-text hover:text-accent-text-hover hover:underline"
            >
              {t("details.viewPortfolio")}
              <Icon icon={ExternalLink} size={14} />
            </a>
          </>
        ) : null}
      </div>
    </Card>
  );
}
