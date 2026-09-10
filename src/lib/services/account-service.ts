import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PHOTOS_BUCKET = "progress-photos";
const STORAGE_LIST_PAGE_SIZE = 1000;

// Every table with user data references auth.users(id) on delete cascade
// (confirmed across all 31 tables in supabase/migrations), so deleting the
// auth user removes essentially everything at the database level in one
// transaction. Storage objects don't participate in that cascade, though —
// they have to be listed and removed explicitly first.
async function deleteOwnProgressPhotos(admin: ReturnType<typeof createAdminClient>, userId: string) {
  for (;;) {
    const { data: files, error: listError } = await admin.storage
      .from(PHOTOS_BUCKET)
      .list(userId, { limit: STORAGE_LIST_PAGE_SIZE });
    if (listError) throw listError;
    if (!files || files.length === 0) break;

    const paths = files.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await admin.storage.from(PHOTOS_BUCKET).remove(paths);
    if (removeError) throw removeError;

    if (files.length < STORAGE_LIST_PAGE_SIZE) break;
  }
}

// Permanently deletes the signed-in user's account and every row of their
// data. Only ever operates on the caller's own id (read from their own
// session, never accepted as a parameter) — the admin client is required
// here because deleting an auth.users row and removing storage objects
// across a whole user folder are both service-role-only operations that no
// RLS-scoped client can perform.
export async function deleteOwnAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const admin = createAdminClient();

  await deleteOwnProgressPhotos(admin, user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;

  await supabase.auth.signOut();
}
