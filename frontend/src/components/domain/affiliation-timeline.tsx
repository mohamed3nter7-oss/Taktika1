import { Building2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ClubAffiliation } from "@/types/player-profile";

import { ClubCrest } from "./club-crest";

/**
 * A timeline, not a list of cards.
 *
 * Cards would give three affiliations equal weight; a career is read top-down.
 * The crest column doubles as the spine - a 40px crest is the node and a
 * subtle hairline connects it to the next one - so the timeline costs no extra
 * column.
 *
 * The current club carries three signals and no extra colour: it is first, it
 * holds the only badge in the list, and its range ends in "present". No accent
 * ring on the crest, because the crest is user artwork and a system colour
 * fights whatever the club's own palette is.
 */
export function AffiliationTimeline({
  affiliations,
  playerName,
  isOwnProfile,
}: {
  affiliations: ClubAffiliation[];
  playerName: string;
  isOwnProfile: boolean;
}) {
  const t = useTranslations("career");
  const format = useFormatter();

  if (affiliations.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title={t("emptyTitle")}
          description={
            isOwnProfile ? t("emptyOwner") : t("emptyVisitor", { name: playerName })
          }
        />
      </Card>
    );
  }

  return (
    <Card padding="none">
      <ol className="px-5 pt-5">
        {affiliations.map((affiliation, index) => {
          const isCurrent = affiliation.endDate === null;
          const isLast = index === affiliations.length - 1;

          return (
            <li key={affiliation.id} className="flex gap-4">
              <div className="flex w-10 shrink-0 flex-col items-center">
                <ClubCrest
                  src={affiliation.clubCrestUrl}
                  name={affiliation.clubName}
                  size="md"
                />
                {isLast ? null : (
                  <div
                    aria-hidden="true"
                    className="my-2 w-px flex-1 bg-edge-subtle"
                  />
                )}
              </div>

              <div className="grid min-w-0 flex-1 gap-1 pb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-body-lg font-medium">
                    {affiliation.clubName}
                  </span>
                  {isCurrent ? (
                    <Badge variant="success">{t("current")}</Badge>
                  ) : null}
                </div>
                <span className="text-body">{affiliation.roleAtClub}</span>
                <span className="font-numeric text-sm tabular-nums text-fg-muted">
                  {t("range", {
                    start: format.dateTime(
                      new Date(affiliation.startDate),
                      "monthYear",
                    ),
                    end: affiliation.endDate
                      ? format.dateTime(new Date(affiliation.endDate), "monthYear")
                      : t("present"),
                  })}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
