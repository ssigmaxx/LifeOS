import "server-only";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id, email: user.email ?? "" };
}

export type Profile = {
  displayName: string | null;
  avatarIcon: string | null;
  birthDate: string | null;
  email: string;
};

export type ProfileUpdate = {
  displayName?: string;
  avatarIcon?: string;
  birthDate?: string;
};

export async function getProfile(): Promise<Profile> {
  const { supabase, userId, email } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_icon, birth_date")
    .eq("id", userId)
    .single();
  if (error) throw error;

  return {
    displayName: data.display_name,
    avatarIcon: data.avatar_icon,
    birthDate: data.birth_date,
    email,
  };
}

export async function updateProfile(input: ProfileUpdate): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName ?? null,
      avatar_icon: input.avatarIcon ?? null,
      birth_date: input.birthDate ?? null,
    })
    .eq("id", userId);
  if (error) throw error;
}
