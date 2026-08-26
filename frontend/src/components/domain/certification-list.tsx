import { BadgeCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { Certification } from "@/types/player-profile";

/**
 * Credentials are reference, not narrative, so they sit in the rail and never
 * compete with the career timeline - two lists in one column would make a
 * scout decide which one matters.
 *
 * Verified is a small accent check after the name; unverified shows nothing.
 * Absence is the signal, which keeps the flag quieter than the role badge
 * instead of racing it.
 *
 * Renders nothing when there are no certifications. That is the design's own
 * decision for the rail: with nothing to put in it the column stays empty on
 * purpose, because collapsing it would move the identity block sideways and a
 * scout opening twenty profiles would get a different page shape every time.
 */
export function CertificationList({
  certifications,
}: {
  certifications: Certification[];
}) {
  const t = useTranslations("certifications");
  const format = useFormatter();

  if (certifications.length === 0) return null;

  return (
    <Card padding="compact" as="section">
      <div className="grid gap-4">
        <h2 className="text-xs tracking-overline text-fg-muted uppercase">
          {t("title")}
        </h2>

        <ul className="grid gap-4">
          {certifications.map((certification) => (
            <li key={certification.id} className="grid gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{certification.name}</span>
                {certification.isVerified ? (
                  <Icon
                    icon={BadgeCheck}
                    size={14}
                    label={t("verified")}
                    className="text-accent-text"
                  />
                ) : null}
              </div>
              {certification.issuer ? (
                <span className="text-xs text-fg-secondary">
                  {certification.issuer}
                </span>
              ) : null}
              {certification.issueDate ? (
                <span className="font-numeric text-xs tabular-nums text-fg-muted">
                  {t("issued", {
                    date: format.dateTime(
                      new Date(certification.issueDate),
                      "monthYear",
                    ),
                  })}
                  {certification.expiryDate
                    ? ` · ${t("expires", {
                        date: format.dateTime(
                          new Date(certification.expiryDate),
                          "monthYear",
                        ),
                      })}`
                    : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
