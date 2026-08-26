import { cn } from "@/lib/cn";

/**
 * A placeholder matching the SHAPE of the content it replaces, not a generic
 * grey box. Pulses 0.5 to 1 opacity - opacity animates cheaply; anything that
 * forces layout drops frames on the hardware most of the market uses.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-4 w-full animate-pulse-soft rounded-sm bg-sunken",
        className,
      )}
    />
  );
}

/** Post-shaped: avatar, two metadata lines, three body lines. */
export function SkeletonPost() {
  return (
    <div className="rounded-lg border border-edge bg-raised p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-3.5 w-35" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <Skeleton className="h-3.5" />
        <Skeleton className="h-3.5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
    </div>
  );
}
