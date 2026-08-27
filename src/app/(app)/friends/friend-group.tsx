"use client";

import { useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FriendSharedHabits } from "@/lib/services/friend-service";
import { removeFriendConnectionAction } from "./actions";
import { FriendHabitCard } from "./friend-habit-card";

export function FriendGroup({ friend, friendshipId }: { friend: FriendSharedHabits; friendshipId: string }) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{friend.friendEmail}</p>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => setRemoveOpen(true)}
        >
          <UserMinus className="size-4" /> Remove
        </Button>
      </div>

      {friend.habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Hasn&apos;t shared any habits yet.</p>
      ) : (
        <div className="space-y-2">
          {friend.habits.map((habit) => (
            <FriendHabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {friend.friendEmail}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll stop seeing each other&apos;s shared habits. You can send a new request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setRemoveOpen(false);
                startTransition(() => removeFriendConnectionAction(friendshipId));
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
