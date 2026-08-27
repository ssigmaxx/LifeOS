import { z } from "zod";

export const friendRequestInputSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export type FriendRequestInput = z.infer<typeof friendRequestInputSchema>;
