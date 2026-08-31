import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
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
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a goal, then break it into milestones you check off as you go."
        />
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
