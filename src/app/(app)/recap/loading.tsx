import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecapLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Card>
        <CardContent className="space-y-1.5">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="divide-y py-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
