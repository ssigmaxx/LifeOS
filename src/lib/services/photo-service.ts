import "server-only";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "progress-photos";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — upload input limit
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1MB — stored output limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const THUMBNAIL_MAX_DIMENSION = 400;
const ORIGINAL_MAX_DIMENSION = 2000;
const SIGNED_URL_TTL_SECONDS = 3600;

// A 2000px photo straight off a modern phone camera can easily land well
// over 1MB at a fixed quality setting — quality 85 alone isn't a
// guarantee. Steps quality down first (it costs less visible detail than
// shrinking dimensions does for a progress photo), then falls back to
// shrinking dimensions once quality bottoms out, until the result is
// under budget or both floors are hit.
async function compressUnderLimit(buffer: Buffer, startDimension: number, maxBytes: number): Promise<Buffer> {
  let dimension = startDimension;
  let quality = 85;
  let output: Buffer;

  for (;;) {
    output = await sharp(buffer)
      .rotate()
      .resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    if (output.length <= maxBytes) return output;

    if (quality > 40) {
      quality -= 10;
    } else if (dimension > 800) {
      dimension = Math.round(dimension * 0.85);
    } else {
      return output; // both floors hit — best effort, accept as-is
    }
  }
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

async function signUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export type PhotoType = "face" | "body";

export type PhotoWithThumb = {
  id: string;
  photoDate: string;
  photoType: PhotoType;
  thumbnailUrl: string;
};

export async function uploadPhoto(input: {
  photoDate: string;
  photoType: PhotoType;
  file: File;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();

  if (!ALLOWED_MIME_TYPES.includes(input.file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed.");
  }
  if (input.file.size === 0) {
    throw new Error("The selected file is empty.");
  }
  if (input.file.size > MAX_SIZE_BYTES) {
    throw new Error("Image must be smaller than 10MB.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());

  // Re-encoding (rather than storing the upload as-is) normalizes the
  // format, bounds dimensions, and strips EXIF metadata — including GPS
  // location — which matters for photos this private. The original also
  // gets compressed under MAX_OUTPUT_BYTES; the thumbnail is already far
  // below that at 400px/quality 75 so it doesn't need the same treatment.
  const [original, thumbnail] = await Promise.all([
    compressUnderLimit(buffer, ORIGINAL_MAX_DIMENSION, MAX_OUTPUT_BYTES),
    sharp(buffer)
      .rotate()
      .resize({
        width: THUMBNAIL_MAX_DIMENSION,
        height: THUMBNAIL_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 75 })
      .toBuffer(),
  ]);

  const basePath = `${userId}/${input.photoDate}-${input.photoType}`;
  const storagePath = `${basePath}.jpg`;
  const thumbnailPath = `${basePath}-thumb.jpg`;

  const [{ error: uploadError }, { error: thumbError }] = await Promise.all([
    supabase.storage
      .from(BUCKET)
      .upload(storagePath, original, { contentType: "image/jpeg", upsert: true }),
    supabase.storage
      .from(BUCKET)
      .upload(thumbnailPath, thumbnail, { contentType: "image/jpeg", upsert: true }),
  ]);
  if (uploadError) throw uploadError;
  if (thumbError) throw thumbError;

  const { error: dbError } = await supabase.from("progress_photos").upsert(
    {
      user_id: userId,
      photo_date: input.photoDate,
      photo_type: input.photoType,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      mime_type: "image/jpeg",
      size_bytes: original.length,
    },
    { onConflict: "user_id,photo_date,photo_type" },
  );
  if (dbError) throw dbError;
}

export async function deletePhoto(photoDate: string, photoType: PhotoType): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { data: row, error: fetchError } = await supabase
    .from("progress_photos")
    .select("storage_path, thumbnail_path")
    .eq("user_id", userId)
    .eq("photo_date", photoDate)
    .eq("photo_type", photoType)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) return;

  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([row.storage_path, row.thumbnail_path]);
  if (removeError) throw removeError;

  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("user_id", userId)
    .eq("photo_date", photoDate)
    .eq("photo_type", photoType);
  if (error) throw error;
}

export async function getTodayPhotos(): Promise<{
  face: PhotoWithThumb | null;
  body: PhotoWithThumb | null;
}> {
  const { supabase, userId } = await requireUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, photo_date, photo_type, thumbnail_path")
    .eq("user_id", userId)
    .eq("photo_date", today);
  if (error) throw error;

  const withUrls = await Promise.all(
    data.map(async (row) => ({
      id: row.id,
      photoDate: row.photo_date,
      photoType: row.photo_type as PhotoType,
      thumbnailUrl: await signUrl(supabase, row.thumbnail_path),
    })),
  );

  return {
    face: withUrls.find((p) => p.photoType === "face") ?? null,
    body: withUrls.find((p) => p.photoType === "body") ?? null,
  };
}

export async function listPhotos(): Promise<PhotoWithThumb[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, photo_date, photo_type, thumbnail_path")
    .eq("user_id", userId)
    .order("photo_date", { ascending: false });
  if (error) throw error;

  return Promise.all(
    data.map(async (row) => ({
      id: row.id,
      photoDate: row.photo_date,
      photoType: row.photo_type as PhotoType,
      thumbnailUrl: await signUrl(supabase, row.thumbnail_path),
    })),
  );
}

export async function getFullPhotoUrl(photoId: string): Promise<string> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return signUrl(supabase, data.storage_path, 300);
}

export async function listPhotoDatesByType(photoType: PhotoType): Promise<string[]> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("photo_date")
    .eq("user_id", userId)
    .eq("photo_type", photoType)
    .order("photo_date", { ascending: false });
  if (error) throw error;
  return data.map((r) => r.photo_date);
}

export async function getComparisonPhotoUrl(
  photoDate: string,
  photoType: PhotoType,
): Promise<string | null> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("user_id", userId)
    .eq("photo_date", photoDate)
    .eq("photo_type", photoType)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return signUrl(supabase, data.storage_path, 300);
}
