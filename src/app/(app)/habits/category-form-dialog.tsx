"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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

// Only this plain-string slice crosses the Server->Client boundary — the
// full Dictionary has function values elsewhere in its tree, which React
// can't serialize as a Client Component prop.
type CategoryDialogDict = Dictionary["habits"]["categoryDialog"];

export function CategoryFormDialog({ dict }: { dict: CategoryDialogDict }) {
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

  useEffect(() => {
    if (state !== initialState && !state.error) toast.success("Category created.");
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" /> {dict.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{dict.newTitle}</DialogTitle>
          <DialogDescription>{dict.newDescription}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">{dict.nameLabel}</Label>
            <Input id="categoryName" name="name" required maxLength={50} autoFocus />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? dict.creating : dict.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
