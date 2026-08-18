"use server";

import { revalidatePath } from "next/cache";
import {
  deletePhoto,
  getComparisonPhotoUrl,
  getFullPhotoUrl,
  uploadPhoto,
  type PhotoType,
} from "@/lib/services/photo-service";

export type FormActionState = { error: string | null };

function revalidatePhotoPaths() {
  revalidatePath("/today");
  revalidatePath("/photos");
}

export async function uploadPhotoAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const photoDate = formData.get("photoDate");
  const photoType = formData.get("photoType");
  const file = formData.get("file");

  if (typeof photoDate !== "string" || !photoDate) {
    return { error: "Missing date." };
  }
  if (photoType !== "face" && photoType !== "body") {
    return { error: "Invalid photo type." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Select an image to upload." };
  }

  try {
    await uploadPhoto({ photoDate, photoType, file });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to upload photo." };
  }

  revalidatePhotoPaths();
  return { error: null };
}

export async function deletePhotoAction(photoDate: string, photoType: PhotoType) {
  await deletePhoto(photoDate, photoType);
  revalidatePhotoPaths();
}

export async function getFullPhotoUrlAction(photoId: string): Promise<string> {
  return getFullPhotoUrl(photoId);
}

export async function getComparisonPhotoUrlAction(
  photoDate: string,
  photoType: PhotoType,
): Promise<string | null> {
  return getComparisonPhotoUrl(photoDate, photoType);
}
