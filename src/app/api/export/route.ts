import { NextResponse } from "next/server";
import { listCategories, listHabits, listHabitLogs, type Habit, type HabitCategory } from "@/lib/services/habit-service";
import { listGoals } from "@/lib/services/goal-service";
import { listTodos } from "@/lib/services/todo-service";
import { listJournalEntries } from "@/lib/services/journal-service";
import { getSavedFoods } from "@/lib/services/nutrition-service";
import { listBudgets } from "@/lib/services/budget-service";

const DATASET_KEYS = ["habits", "habitLogs", "goals", "todos", "journal", "savedFoods", "budget"] as const;
type DatasetKey = (typeof DATASET_KEYS)[number];

function isDatasetKey(value: string): value is DatasetKey {
  return (DATASET_KEYS as readonly string[]).includes(value);
}

function withCategoryNames(habits: Habit[], categories: HabitCategory[]) {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  return habits.map((h) => ({ ...h, categoryName: h.categoryId ? (nameById.get(h.categoryId) ?? null) : null }));
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsvTable(title: string, rows: object[]): string {
  if (rows.length === 0) return `# ${title}\n(no rows)\n`;
  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );
  const lines = [
    `# ${title}`,
    columns.join(","),
    ...rows.map((row) => columns.map((c) => csvCell((row as Record<string, unknown>)[c])).join(",")),
  ];
  return lines.join("\n") + "\n";
}

// A plain Route Handler so the browser can navigate straight to it as a
// file download (the Analytics export dialog builds this URL from the
// chosen date range / datasets / format and just does
// window.location.href = url) — a Server Action can't produce a
// Content-Disposition response.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || undefined;
  const end = searchParams.get("end") || undefined;
  const format = searchParams.get("format") === "csv" ? "csv" : "json";
  const requested = searchParams.get("datasets");
  const datasets = new Set<DatasetKey>(
    requested ? requested.split(",").filter(isDatasetKey) : DATASET_KEYS,
  );

  try {
    const [habits, habitCategories, habitLogs, goals, todos, journalEntries, savedFoods, budgetCategories] =
      await Promise.all([
        datasets.has("habits") ? listHabits() : Promise.resolve([]),
        datasets.has("habits") ? listCategories() : Promise.resolve([]),
        datasets.has("habitLogs") ? listHabitLogs({ start, end }) : Promise.resolve([]),
        datasets.has("goals") ? listGoals() : Promise.resolve([]),
        datasets.has("todos") ? listTodos() : Promise.resolve([]),
        datasets.has("journal")
          ? listJournalEntries({ limit: 10000, startDate: start, endDate: end })
          : Promise.resolve([]),
        datasets.has("savedFoods") ? getSavedFoods() : Promise.resolve([]),
        datasets.has("budget") ? listBudgets() : Promise.resolve([]),
      ]);

    const datePart = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const sections: string[] = [];
      if (datasets.has("habits")) {
        sections.push(toCsvTable("Habits", withCategoryNames(habits, habitCategories)));
        sections.push(toCsvTable("Habit categories", habitCategories));
      }
      if (datasets.has("habitLogs")) sections.push(toCsvTable("Habit logs", habitLogs));
      if (datasets.has("goals")) sections.push(toCsvTable("Goals", goals));
      if (datasets.has("todos")) sections.push(toCsvTable("Todos", todos));
      if (datasets.has("journal")) sections.push(toCsvTable("Journal entries", journalEntries));
      if (datasets.has("savedFoods")) sections.push(toCsvTable("Saved foods", savedFoods));
      if (datasets.has("budget")) sections.push(toCsvTable("Budget categories", budgetCategories));

      return new NextResponse(sections.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="meridian-export-${datePart}.csv"`,
        },
      });
    }

    const payload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      range: { start: start ?? null, end: end ?? null },
    };
    if (datasets.has("habits")) {
      payload.habits = withCategoryNames(habits, habitCategories);
      payload.habitCategories = habitCategories;
    }
    if (datasets.has("habitLogs")) payload.habitLogs = habitLogs;
    if (datasets.has("goals")) payload.goals = goals;
    if (datasets.has("todos")) payload.todos = todos;
    if (datasets.has("journal")) payload.journalEntries = journalEntries;
    if (datasets.has("savedFoods")) payload.savedFoods = savedFoods;
    if (datasets.has("budget")) payload.budgetCategories = budgetCategories;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="meridian-export-${datePart}.json"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export data.";
    return NextResponse.json({ error: message }, { status: message === "Not authenticated." ? 401 : 500 });
  }
}
