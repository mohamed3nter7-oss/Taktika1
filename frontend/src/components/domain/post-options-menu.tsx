"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Menu } from "@/components/ui/menu";

/**
 * The author-only menu on a post.
 *
 * Both actions are no-ops: the `posts` module is not built, so there is
 * nothing to edit against and nothing to delete. They log and close.
 *
 * Delete deliberately does NOT confirm yet. A confirmation dialog needs a
 * focus trap, `inert` on the background, scroll lock and focus restoration,
 * and a focus trap that is subtly wrong looks completely fine to anyone
 * testing with a mouse - so it is a decision of its own rather than something
 * to improvise underneath a menu item.
 */
export function PostOptionsMenu({ postId }: { postId: string }) {
  const t = useTranslations("posts");

  return (
    <Menu
      label={t("options")}
      icon={Ellipsis}
      items={[
        {
          id: "edit",
          label: t("edit"),
          icon: Pencil,
          onSelect: () => console.log("edit post", postId),
        },
        {
          id: "delete",
          label: t("delete"),
          icon: Trash2,
          tone: "danger",
          // TODO: open a confirmation dialog before deleting. Not built - the
          // dialog primitive is an open decision.
          onSelect: () => console.log("delete post (TODO: confirm)", postId),
        },
      ]}
    />
  );
}
