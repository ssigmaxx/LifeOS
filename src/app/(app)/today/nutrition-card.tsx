import Link from "next/link";
import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DailyTotals, NutritionProfile } from "@/lib/services/nutrition-service";

export function NutritionCard({
  profile,
  totals,
}: {
  profile: NutritionProfile | null;
  totals: DailyTotals;
}) {
  if (!profile) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Apple className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Nutrition</p>
            <p className="text-xs text-muted-foreground">No calorie target set up yet.</p>
          </div>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/nutrition" />}>
            Set up
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.min(Math.round((totals.calories / profile.dailyCalorieTarget) * 100), 100);
  const remaining = Math.max(profile.dailyCalorieTarget - totals.calories, 0);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Apple className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Nutrition</p>
            <p className="text-xs text-muted-foreground">
              {totals.calories} / {profile.dailyCalorieTarget} kcal · {remaining} remaining
            </p>
          </div>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/nutrition" />}>
            Log food
          </Button>
        </div>
        <Progress value={pct} />
      </CardContent>
    </Card>
  );
}
