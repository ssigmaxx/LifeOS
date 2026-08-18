import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EveningEntryValues, MorningEntryValues } from "@/lib/validations/journal";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type JournalEntryType = "morning" | "evening";

export type JournalEntry = {
  id: string;
  entryDate: string;
  entryType: JournalEntryType;
  mood: number | null;
  text: string | null;
  extra: Record<string, string>;
};

function mapRow(row: {
  id: string;
  entry_date: string;
  entry_type: JournalEntryType;
  mood: number | null;
  text: string | null;
  extra: Record<string, string> | null;
}): JournalEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    entryType: row.entry_type,
    mood: row.mood,
    text: row.text,
    extra: row.extra ?? {},
  };
}

export async function getTodayEntries(): Promise<{
  morning: JournalEntry | null;
  evening: JournalEntry | null;
}> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, entry_date, entry_type, mood, text, extra")
    .eq("user_id", userId)
    .eq("entry_date", todayISO());
  if (error) throw error;

  const rows = data.map(mapRow);
  return {
    morning: rows.find((r) => r.entryType === "morning") ?? null,
    evening: rows.find((r) => r.entryType === "evening") ?? null,
  };
}

function omitEmpty(obj: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== ""),
  ) as Record<string, string>;
}

export async function upsertMorningEntry(
  entryDate: string,
  values: MorningEntryValues,
): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("journal_entries").upsert(
    {
      user_id: userId,
      entry_date: entryDate,
      entry_type: "morning",
      mood: values.mood ?? null,
      text: values.text ?? null,
      extra: omitEmpty({ intention: values.intention, goals: values.goals }),
    },
    { onConflict: "user_id,entry_date,entry_type" },
  );
  if (error) throw error;
}

export async function upsertEveningEntry(
  entryDate: string,
  values: EveningEntryValues,
): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("journal_entries").upsert(
    {
      user_id: userId,
      entry_date: entryDate,
      entry_type: "evening",
      mood: values.mood ?? null,
      text: values.text ?? null,
      extra: omitEmpty({
        wentWell: values.wentWell,
        couldImprove: values.couldImprove,
        gratitude: values.gratitude,
      }),
    },
    { onConflict: "user_id,entry_date,entry_type" },
  );
  if (error) throw error;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function listJournalEntries(options: {
  search?: string;
  limit?: number;
}): Promise<JournalEntry[]> {
  const { supabase, userId } = await requireUserId();
  let query = supabase
    .from("journal_entries")
    .select("id, entry_date, entry_type, mood, text, extra")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("entry_type", { ascending: true })
    .limit(options.limit ?? 100);

  if (options.search) {
    // Simple substring search over the free-text column. Good enough for
    // V1 volumes; a tsvector index is the natural upgrade if needed later.
    query = query.ilike("text", `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapRow);
}
