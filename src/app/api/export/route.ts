import { NextResponse } from "next/server";
import { listCategories, listHabits, listHabitLogs } from "@/lib/services/habit-service";
import { listGoals } from "@/lib/services/goal-service";
import { listTodos } from "@/lib/services/todo-service";
import { listJournalEntries } from "@/lib/services/journal-service";
import { getSavedFoods } from "@/lib/services/nutrition-service";
import { listBudgets } from "@/lib/services/budget-service";

// A plain Route Handler so the browser can navigate straight to it as a
// file download (Settings links here with a plain <a download>) — a
// Server Action can't produce a Content-Disposition response.
export async function GET() {
  try {
    const [habits, habitCategories, habitLogs, goals, todos, journalEntries, savedFoods, budgetCategories] =
      await Promise.all([
        listHabits(),
        listCategories(),
        listHabitLogs(),
        listGoals(),
        listTodos(),
        listJournalEntries({ limit: 10000 }),
        getSavedFoods(),
        listBudgets(),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      habits,
      habitCategories,
      habitLogs,
      goals,
      todos,
      journalEntries,
      savedFoods,
      budgetCategories,
    };

    const filename = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export data.";
    return NextResponse.json({ error: message }, { status: message === "Not authenticated." ? 401 : 500 });
  }
}
