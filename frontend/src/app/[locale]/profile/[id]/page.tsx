import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AboutPanel } from "@/components/domain/about-panel";
import { AffiliationTimeline } from "@/components/domain/affiliation-timeline";
import { CertificationList } from "@/components/domain/certification-list";
import { PlayerDetailsCard } from "@/components/domain/player-details-card";
import { PostList } from "@/components/domain/post-list";
import { ProfileHeader } from "@/components/domain/profile-header";
import { ProfileSkeleton } from "@/components/domain/profile-skeleton";
import { ProfileTabs } from "@/components/domain/profile-tabs";
import {
  getPlayerProfilePage,
  getProfileSummary,
  MOCK_NOW,
} from "@/mocks/player-profile";
import type { PostAuthor } from "@/types/player-profile";

type ProfileParams = { params: Promise<{ locale: string; id: string }> };

const POSTS = "posts";
const ABOUT = "about";
const CAREER = "career";

export async function generateMetadata({
  params,
}: ProfileParams): Promise<Metadata> {
  const { id } = await params;
  const summary = getProfileSummary(id);
  return summary ? { title: summary.fullName } : {};
}

/**
 * The route shell.
 *
 * The missing-profile check happens here, before anything is streamed, and the
 * slow work sits behind a Suspense boundary underneath it. That ordering is
 * the whole point: a route-level `loading.tsx` flushes the shell with a 200
 * before the page body runs, so a later `notFound()` renders the not-found
 * body under a 200 - a soft 404, which is precisely what a search engine must
 * not see on an indexable profile route. Verified both ways: with
 * `loading.tsx` present this route answered 200 for an unknown id; without it,
 * 404.
 *
 * The fallback still renders on client-side navigation, so nothing is lost.
 */
export default async function ProfilePage({ params }: ProfileParams) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!getProfileSummary(id)) notFound();

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent id={id} />
    </Suspense>
  );
}

async function ProfileContent({ id }: { id: string }) {
  const page = await getPlayerProfilePage(id);
  if (!page) notFound();

  const { profile, affiliations, certifications, posts } = page;
  const t = await getTranslations();

  // `endDate === null` is the current club. Affiliations are date ranges, never
  // a scalar current_club, so this is derived rather than stored.
  const currentClub =
    affiliations.find((affiliation) => affiliation.endDate === null) ??
    affiliations[0] ??
    null;

  const position = t(`positions.${profile.primaryPosition}`);
  const author: PostAuthor = {
    name: profile.fullName,
    avatarUrl: profile.avatarUrl,
    role: "PLAYER",
    subtitle: currentClub ? `${position} · ${currentClub.clubName}` : position,
  };

  return (
    <main className="mx-auto flex w-full max-w-page flex-col items-stretch gap-6 px-6 py-6 pb-16 desktop:flex-row desktop:items-start desktop:justify-center">
      <div className="grid min-w-0 gap-4 desktop:max-w-content desktop:flex-1">
        <ProfileHeader profile={profile} currentClub={currentClub} />

        <ProfileTabs
          defaultValue={POSTS}
          label={t("tabs.label")}
          tabs={[
            { value: POSTS, label: t("tabs.posts"), count: posts.length },
            { value: ABOUT, label: t("tabs.about") },
            {
              value: CAREER,
              label: t("tabs.career"),
              count: affiliations.length,
            },
          ]}
          panels={{
            [POSTS]: (
              <PostList
                posts={posts}
                author={author}
                now={MOCK_NOW.toISOString()}
                playerName={profile.fullName}
                isOwnProfile={profile.isOwnProfile}
                careerTabValue={CAREER}
              />
            ),
            [ABOUT]: <AboutPanel profile={profile} />,
            [CAREER]: (
              <AffiliationTimeline
                affiliations={affiliations}
                playerName={profile.fullName}
                isOwnProfile={profile.isOwnProfile}
              />
            ),
          }}
        />
      </div>

      {/* The rail keeps its width even when both cards are absent. Collapsing
          it would move the identity block sideways, and a scout opening twenty
          profiles in a session would get a different page shape every time. */}
      <aside className="grid gap-4 desktop:sticky desktop:top-22 desktop:w-75 desktop:shrink-0 desktop:self-start">
        <PlayerDetailsCard profile={profile} />
        <CertificationList certifications={certifications} />
      </aside>
    </main>
  );
}
