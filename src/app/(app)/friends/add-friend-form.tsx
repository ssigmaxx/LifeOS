"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendFriendRequestAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function AddFriendForm() {
  const [state, formAction, isPending] = useActionState(sendFriendRequestAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="friend-email">Add a friend</Label>
        <Input id="friend-email" name="email" type="email" placeholder="friend@example.com" required />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        <UserPlus className="size-4" /> {isPending ? "Sending…" : "Send request"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:basis-full">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
