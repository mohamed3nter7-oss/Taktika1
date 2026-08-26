import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonPost } from "@/components/ui/skeleton";

/**
 * The profile page in outline.
 *
 * Shaped to the real content rather than to a generic block: a 120px round
 * avatar, a 32px name, one headline line, a chip row, a club row, the action
 * row, then the tab strip and two post-shaped cards. A skeleton whose
 * proportions do not match what replaces it produces a visible jump, which is
 * the thing a skeleton exists to prevent.
 */
export function ProfileSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-col items-stretch gap-6 px-6 py-6 pb-16 desktop:flex-row desktop:items-start desktop:justify-center">
      <div className="grid min-w-0 gap-4 desktop:max-w-content desktop:flex-1">
        <Card>
          <div className="grid gap-5">
            <div className="flex items-start gap-5">
              <Skeleton className="size-30 rounded-full" />
              <div className="grid min-w-0 flex-1 gap-3">
                <div className="grid gap-1">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-7 w-9 rounded-sm" />
                  <Skeleton className="h-7 w-9 rounded-sm" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-6 rounded-md" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-3.5 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-3.5 w-56" />
              <div className="flex gap-2 ms-auto">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
            <div aria-hidden="true" className="-mx-5 -mb-5 h-px bg-pitch" />
          </div>
        </Card>

        <div className="flex gap-6 border-b border-edge pb-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-16" />
        </div>

        <SkeletonPost />
        <SkeletonPost />
      </div>

      <aside className="grid gap-4 desktop:w-75 desktop:shrink-0">
        <Card padding="compact">
          <div className="grid gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5" />
            <Skeleton className="h-3.5" />
            <Skeleton className="h-3.5" />
          </div>
        </Card>
        <Card padding="compact">
          <div className="grid gap-4">
            <Skeleton className="h-3 w-24" />
            <div className="grid gap-1">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="grid gap-1">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        </Card>
      </aside>
    </main>
  );
}
