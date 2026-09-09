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

export type Gender = "male" | "female";

export type Profile = {
  displayName: string | null;
  avatarIcon: string | null;
  birthDate: string | null;
  gender: Gender | null;
  email: string;
};

export type ProfileUpdate = {
  displayName?: string;
  avatarIcon?: string;
  birthDate?: string;
  gender?: Gender;
};

export type UpdateProfileResult = {
  /** True if this update just turned cycle tracking on automatically. */
  cycleTrackingAutoEnabled: boolean;
};

export async function getProfile(): Promise<Profile> {
  const { supabase, userId, email } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_icon, birth_date, gender")
    .eq("id", userId)
    .single();
  if (error) throw error;

  return {
    displayName: data.display_name,
    avatarIcon: data.avatar_icon,
    birthDate: data.birth_date,
    gender: data.gender as Gender | null,
    email,
  };
}

export async function updateProfile(input: ProfileUpdate): Promise<UpdateProfileResult> {
  const { supabase, userId } = await requireUser();

  const patch: Record<string, unknown> = {
    display_name: input.displayName ?? null,
    avatar_icon: input.avatarIcon ?? null,
    birth_date: input.birthDate ?? null,
    gender: input.gender ?? null,
  };

  // Selecting "female" turns cycle tracking on automatically, once, right
  // when gender transitions into female — never when it's already female
  // (so a later save with unrelated field changes can't re-flip a toggle
  // the user deliberately turned back off), and it never flips it off on
  // its own either.
  let cycleTrackingAutoEnabled = false;
  if (input.gender === "female") {
    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", userId)
      .single();
    if (currentError) throw currentError;
    if (current.gender !== "female") {
      patch.cycle_tracking_enabled = true;
      cycleTrackingAutoEnabled = true;
    }
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;

  return { cycleTrackingAutoEnabled };
}
