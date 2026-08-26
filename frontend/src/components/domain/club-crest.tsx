import Image from "next/image";

import { cn } from "@/lib/cn";
import { crestInitials } from "@/lib/format";

const SIZE = {
  sm: { box: "size-6", px: 24, text: "text-xs" },
  md: { box: "size-10", px: 40, text: "text-xs" },
  lg: { box: "size-16", px: 64, text: "text-h3" },
} as const;

/**
 * A club crest on the mandatory light plate.
 *
 * `object-contain`, not cover: a crest cropped to fill is a mangled club
 * identity. No accent ring and no system colour on the artwork either - the
 * crest carries the club's own palette and a system colour fights it.
 */
export function ClubCrest({
  src,
  name,
  size = "md",
}: {
  src: string | null;
  name: string;
  size?: keyof typeof SIZE;
}) {
  const s = SIZE[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-edge p-0.5 font-semibold",
        src ? "bg-plate" : "bg-sunken text-fg-secondary",
        s.box,
        s.text,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={s.px}
          height={s.px}
          className="size-full object-contain"
        />
      ) : (
        crestInitials(name)
      )}
    </span>
  );
}
