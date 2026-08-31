import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BudgetLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-7 w-32" />
      </div>
      <Card>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="divide-y py-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5 py-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-1 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
