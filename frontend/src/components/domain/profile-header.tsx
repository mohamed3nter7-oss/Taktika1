import { useFormatter, useTranslations } from "next-intl";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { ClubAffiliation, PlayerProfile } from "@/types/player-profile";

import { ClubCrest } from "./club-crest";
import { PositionChip } from "./position-chip";
import { ProfileActions } from "./profile-actions";
import { RoleBadge } from "./role-badge";

/** A thin vertical hairline between two inline groups. */
function Separator() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 inline-block h-3.5 w-px bg-edge"
    />
  );
}

/** The typographic separator the design system uses. Never a bullet. */
function Dot() {
  return (
    <span aria-hidden="true" className="text-fg-muted">
      ·
    </span>
  );
}

/**
 * The identity surface, and the only place the pitch line appears.
 *
 * Read order is deliberate: name and role, then position and foot, then club
 * and league level, then location and age, then followers. Position and foot
 * outrank the administrative facts because they are what a scout filters on,
 * and they are the only facts here no other role's profile carries.
 *
 * Every optional item is a whole row rather than an inline fragment, so
 * removing one closes a gap instead of reflowing a sentence.
 */
export function ProfileHeader({
  profile,
  currentClub,
}: {
  profile: PlayerProfile;
  currentClub: ClubAffiliation | null;
}) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <Card>
      <div className="grid gap-5">
        <div className="flex items-start gap-5">
          <Avatar
            src={profile.avatarUrl}
            name={profile.fullName}
            size="xl"
            badge={(glyphSize) => (
              <RoleBadge role="PLAYER" variant="compact" glyphSize={glyphSize} />
            )}
          />

          <div className="grid min-w-0 flex-1 gap-3">
            <div className="grid gap-1">
              <h1 className="text-h1 tracking-tight text-pretty">
                {profile.fullName}
              </h1>
              {profile.headline ? (
                <p className="text-body text-fg-secondary text-pretty">
                  {profile.headline}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role="PLAYER" />
              <PositionChip position={profile.primaryPosition} variant="primary" />
              {profile.secondaryPosition ? (
                <PositionChip position={profile.secondaryPosition} />
              ) : null}
              <Separator />
              <span className="text-sm text-fg-secondary">
                {t(`foot.${profile.preferredFoot}`)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentClub ? (
                <>
                  <ClubCrest
                    src={currentClub.clubCrestUrl}
                    name={currentClub.clubName}
                    size="sm"
                  />
                  <span className="text-body font-medium">
                    {currentClub.clubName}
                  </span>
                  <Dot />
                </>
              ) : null}
              <span className="text-body text-fg-secondary">
                {t(`league.${profile.leagueLevel}`)}
              </span>
            </div>

            <p className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
              <span>
                {t("profile.location", {
                  city: profile.city,
                  country: profile.country,
                })}
              </span>
              <Dot />
              <span>
                {t("profile.age", { value: format.number(profile.age, "plain") })}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <p className="flex flex-wrap items-center gap-2 font-numeric text-sm tabular-nums text-fg-secondary">
            <span>
              {t("profile.followers", {
                count: profile.followersCount,
                value: format.number(profile.followersCount, "grouped"),
              })}
            </span>
            <Dot />
            <span>
              {t("profile.following", {
                value: format.number(profile.followingCount, "grouped"),
              })}
            </span>
          </p>

          <div className="flex gap-2 ms-auto">
            <ProfileActions
              isOwnProfile={profile.isOwnProfile}
              isFollowing={profile.isFollowing}
              profileId={profile.id}
            />
          </div>
        </div>

        {/* The single signature element: one 1px accent rule, bleeding to both
            card edges, once per page. */}
        <div aria-hidden="true" className="-mx-5 -mb-5 h-px bg-pitch" />
      </div>
    </Card>
  );
}
