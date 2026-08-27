import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getDailyLog, getNutritionProfile, getSavedFoods, sumNutrition } from "@/lib/services/nutrition-service";
import { FoodLogPanel } from "./food-log-panel";
import { MealList } from "./meal-list";
import { NutritionProfileForm } from "./nutrition-profile-form";

function macroPct(consumed: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(Math.round((consumed / target) * 100), 100);
}

export default async function NutritionPage() {
  const [profile, entries, savedFoods] = await Promise.all([getNutritionProfile(), getDailyLog(), getSavedFoods()]);
  const totals = sumNutrition(entries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
          <p className="text-sm text-muted-foreground">Calorie and macro tracking for foods in Germany.</p>
        </div>
        {profile ? (
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Settings2 className="size-4" /> Edit target
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit calorie target</DialogTitle>
                <DialogDescription>Recalculate your target from updated stats or goals.</DialogDescription>
              </DialogHeader>
              <NutritionProfileForm profile={profile} />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {!profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Set your daily calorie target</CardTitle>
          </CardHeader>
          <CardContent>
            <NutritionProfileForm profile={null} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {totals.calories} / {profile.dailyCalorieTarget} kcal
              </span>
              <span className="text-muted-foreground">
                {Math.max(profile.dailyCalorieTarget - totals.calories, 0)} kcal remaining
              </span>
            </div>
            <Progress value={macroPct(totals.calories, profile.dailyCalorieTarget)} />

            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein</span>
                  <span>
                    {totals.proteinG}/{profile.proteinTargetG}g
                  </span>
                </div>
                <Progress value={macroPct(totals.proteinG, profile.proteinTargetG)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carbs</span>
                  <span>
                    {totals.carbsG}/{profile.carbsTargetG}g
                  </span>
                </div>
                <Progress value={macroPct(totals.carbsG, profile.carbsTargetG)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fat</span>
                  <span>
                    {totals.fatG}/{profile.fatTargetG}g
                  </span>
                </div>
                <Progress value={macroPct(totals.fatG, profile.fatTargetG)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Log food</CardTitle>
        </CardHeader>
        <CardContent>
          <FoodLogPanel savedFoods={savedFoods} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s log</CardTitle>
        </CardHeader>
        <CardContent>
          <MealList entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
