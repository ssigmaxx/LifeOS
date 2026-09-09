"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createCategoryAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function CategoryFormDialog({ dict }: { dict: Dictionary }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);

  // Close the dialog once a submission succeeds. Adjusting state during
  // render (rather than in an effect) avoids an extra render pass — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" /> {dict.habits.categoryDialog.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{dict.habits.categoryDialog.newTitle}</DialogTitle>
          <DialogDescription>{dict.habits.categoryDialog.newDescription}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">{dict.habits.categoryDialog.nameLabel}</Label>
            <Input id="categoryName" name="name" required maxLength={50} autoFocus />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? dict.habits.categoryDialog.creating : dict.habits.categoryDialog.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
