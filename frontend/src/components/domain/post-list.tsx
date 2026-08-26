"use client";

import { ArrowRight, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Post, PostAuthor } from "@/types/player-profile";

import { PostCard } from "./post-card";
import { useGoToTab } from "./profile-tabs";

/**
 * The posts tab, including its empty state.
 *
 * Posts are the only surface on the page written by the player rather than
 * assembled from fields, so they are the fastest read on character and intent
 * and they are the default tab.
 *
 * The empty state differs by viewer on purpose: the owner gets Create post,
 * and a visitor - who has no action to take here - gets one line naming the
 * space and a quiet route to the tab that does have content. An empty state
 * offering a dead control is worse than one offering none.
 */
export function PostList({
  posts,
  author,
  now,
  playerName,
  isOwnProfile,
  careerTabValue,
}: {
  posts: Post[];
  author: PostAuthor;
  now: string;
  playerName: string;
  isOwnProfile: boolean;
  careerTabValue: string;
}) {
  const t = useTranslations("posts");
  const goToTab = useGoToTab();

  if (posts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title={t("emptyTitle")}
          description={
            isOwnProfile ? t("emptyOwner") : t("emptyVisitor", { name: playerName })
          }
          action={
            isOwnProfile ? (
              <Button
                variant="primary"
                onClick={() => console.log("create post")}
              >
                {t("createPost")}
              </Button>
            ) : (
              <Button
                variant="link"
                iconEnd={ArrowRight}
                mirrorIcons
                onClick={() => goToTab(careerTabValue)}
              >
                {t("seeCareer")}
              </Button>
            )
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} author={author} now={now} />
      ))}
    </div>
  );
}
