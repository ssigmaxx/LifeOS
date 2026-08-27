"use server";

import { revalidatePath } from "next/cache";
import { friendRequestInputSchema } from "@/lib/validations/friend";
import {
  removeFriendConnection,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/lib/services/friend-service";

export type FormActionState = { error: string | null };

export async function sendFriendRequestAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = friendRequestInputSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  try {
    await sendFriendRequest(parsed.data.email);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send request." };
  }

  revalidatePath("/friends");
  return { error: null };
}

export async function respondToFriendRequestAction(friendshipId: string, accept: boolean) {
  await respondToFriendRequest(friendshipId, accept);
  revalidatePath("/friends");
}

export async function removeFriendConnectionAction(friendshipId: string) {
  await removeFriendConnection(friendshipId);
  revalidatePath("/friends");
}
