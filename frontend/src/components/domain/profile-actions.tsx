"use client";

import { Pencil, Send, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * The header's action row, and the only client boundary in the header.
 *
 * Kept apart from `ProfileHeader` so the identity block - which is the part
 * search engines and first paint care about - stays a Server Component.
 *
 * No mutations in this pass: both handlers log. Message is the single filled
 * accent button on the page, and Edit profile takes exactly that slot when the
 * owner is looking, so the one-primary-action rule holds in both states.
 */
export function ProfileActions({
  isOwnProfile,
  isFollowing,
  profileId,
}: {
  isOwnProfile: boolean;
  isFollowing: boolean;
  profileId: string;
}) {
  const t = useTranslations("profile");

  if (isOwnProfile) {
    return (
      <Button
        variant="primary"
        iconStart={Pencil}
        onClick={() => console.log("edit profile", profileId)}
      >
        {t("editProfile")}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        iconStart={UserPlus}
        aria-pressed={isFollowing}
        onClick={() => console.log("toggle follow", profileId)}
      >
        {isFollowing ? t("following_action") : t("follow")}
      </Button>
      <Button
        variant="primary"
        iconStart={Send}
        onClick={() => console.log("send message", profileId)}
      >
        {t("sendMessage")}
      </Button>
    </>
  );
}
