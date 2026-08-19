import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function LifestyleCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function TodayLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-2 w-28 shrink-0 rounded-full" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Card>
          <CardContent className="divide-y py-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LifestyleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
