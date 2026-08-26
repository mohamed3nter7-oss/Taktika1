"use client";

import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import { POST_CLAMP_CHARS, relativeTime } from "@/lib/format";
import type { Post, PostAuthor, PostImage } from "@/types/player-profile";

import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "./role-badge";

/**
 * Up to four images. The contract caps the array at four, so the design
 * system's "+N" overlay is unreachable and is not built.
 *
 * The three-image layout is expressed as the grid that produces it - a
 * three-column track with the first cell spanning two columns and two rows -
 * rather than as a hardcoded aspect ratio. The ratio emerges from the track
 * and the gap, and stays correct if either changes.
 */
function ImageGrid({ images }: { images: PostImage[] }) {
  const plate =
    "relative overflow-hidden rounded-lg bg-plate";

  if (images.length === 1) {
    const image = images[0]!;
    return (
      <div className={cn(plate, "aspect-video")}>
        <Image
          src={image.url}
          alt=""
          fill
          sizes="(max-width: 1023px) 100vw, 604px"
          className="object-contain"
        />
      </div>
    );
  }

  const three = images.length === 3;

  return (
    <div
      className={cn(
        "grid gap-1",
        three ? "grid-cols-3 grid-rows-2" : "grid-cols-2",
      )}
    >
      {images.map((image, index) => {
        const tall = three && index === 0;
        return (
          <div
            key={image.url}
            className={cn(
              plate,
              tall ? "col-span-2 row-span-2" : "aspect-square",
            )}
          >
            <Image
              src={image.url}
              alt=""
              fill
              sizes="(max-width: 1023px) 50vw, 300px"
              className="object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}

function ActionCount({ value }: { value: string }) {
  return (
    <span className="font-numeric text-sm tabular-nums text-fg-secondary">
      {value}
    </span>
  );
}

/**
 * The most-viewed component in the product. Text and images only - there is no
 * video anywhere.
 *
 * `author` is a prop rather than something derived from surrounding profile
 * context. On a profile page the author is always the owner; in the feed it is
 * not, and taking it as a prop now costs nothing and avoids rewriting this
 * component when the feed lands.
 *
 * Like and comment log rather than mutate in this pass. The design system's
 * save and post-options controls are not built: no field in the contract backs
 * either of them.
 */
export function PostCard({
  post,
  author,
  now,
}: {
  post: Post;
  author: PostAuthor;
  /** ISO timestamp the relative time is measured against. */
  now: string;
}) {
  const t = useTranslations("posts");
  const tTime = useTranslations("time");
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);

  const relative = relativeTime(post.createdAt, new Date(now));
  const timeLabel =
    relative.unit === "absolute"
      ? format.dateTime(new Date(post.createdAt), "dayMonthYear")
      : tTime(`${relative.unit}Ago`, {
          value: format.number(relative.value, "plain"),
        });

  const clamped = !expanded && post.content.length > POST_CLAMP_CHARS;

  return (
    <Card as="article">
      <div className="grid gap-4">
        <div className="flex items-start gap-3">
          <Avatar src={author.avatarUrl} name={author.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium">{author.name}</span>
              <RoleBadge role={author.role} />
            </div>
            {author.subtitle ? (
              <p className="text-sm text-fg-secondary">{author.subtitle}</p>
            ) : null}
            <p className="text-sm text-fg-muted">
              <time dateTime={post.createdAt}>{timeLabel}</time>
              {post.editedAt ? <> · {t("edited")}</> : null}
            </p>
          </div>
        </div>

        <p
          className={cn(
            "text-body-lg whitespace-pre-line text-pretty",
            clamped && "line-clamp-4",
          )}
        >
          {post.content}
        </p>

        {clamped ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="justify-self-start cursor-pointer border-none bg-transparent p-0 text-sm text-accent-text hover:text-accent-text-hover hover:underline"
          >
            {t("showMore")}
          </button>
        ) : null}

        {post.images.length > 0 ? <ImageGrid images={post.images} /> : null}

        <div aria-hidden="true" className="-mx-5 h-px bg-edge-subtle" />

        <div className="flex items-center gap-6">
          <span className="inline-flex items-center gap-1">
            <IconButton
              icon={Heart}
              label={t("like")}
              size="sm"
              onClick={() => console.log("like post", post.id)}
            />
            <ActionCount value={format.number(post.likesCount, "grouped")} />
          </span>
          <span className="inline-flex items-center gap-1">
            <IconButton
              icon={MessageCircle}
              label={t("comment")}
              size="sm"
              onClick={() => console.log("comment on post", post.id)}
            />
            <ActionCount value={format.number(post.commentsCount, "grouped")} />
          </span>
        </div>
      </div>
    </Card>
  );
}
