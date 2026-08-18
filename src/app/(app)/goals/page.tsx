import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listGoals } from "@/lib/services/goal-service";
import { GoalCard } from "./goal-card";
import { GoalFormDialog } from "./goal-form-dialog";

export default async function GoalsPage() {
  const goals = await listGoals();
  const active = goals.filter((g) => g.status === "active");
  const inactive = goals.filter((g) => g.status !== "active");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Set realistic targets and track progress toward them.
          </p>
        </div>
        <GoalFormDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Goal
            </Button>
          }
        />
      </div>

      {goals.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <Target className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base font-medium">No goals yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Set a target for water, sleep, meditation, gym, or fasting.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active goals.</p>
            ) : (
              active.map((goal) => <GoalCard key={goal.id} goal={goal} />)
            )}
          </div>

          {inactive.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Completed &amp; abandoned
              </h2>
              {inactive.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
