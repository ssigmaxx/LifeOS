"use client";

import { useActionState, useEffect, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { runAction } from "@/lib/toast-action";
import {
  deleteCategoryAction,
  renameCategoryAction,
  restoreCategoryAction,
  type FormActionState,
} from "./actions";

const initialState: FormActionState = { error: null };

// Only this plain-string slice crosses the Server->Client boundary. The
// caller interpolates the category name into `deleteTitle`'s template
// before passing it down, since `dict.habits.categoryMenu` is server-only.
type CategoryMenuDict = Dictionary["habits"]["categoryMenu"];

export function CategoryMenu({
  categoryId,
  categoryName,
  habitIds,
  dict,
}: {
  categoryId: string;
  categoryName: string;
  /** Habits currently in this category — captured so a delete can be undone by reassigning them back. */
  habitIds: string[];
  dict: CategoryMenuDict;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const action = renameCategoryAction.bind(null, categoryId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state !== initialState && !state.error) setRenameOpen(false);
  }

  useEffect(() => {
    if (state !== initialState && !state.error) toast.success("Category renamed.");
  }, [state]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`${categoryName} category options`} />}
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="size-4" /> {dict.rename}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> {dict.deleteCategory}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dict.renameTitle}</DialogTitle>
            <DialogDescription>{dict.renameDescription}</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`rename-${categoryId}`}>{dict.nameLabel}</Label>
              <Input
                id={`rename-${categoryId}`}
                name="name"
                required
                maxLength={50}
                defaultValue={categoryName}
                autoFocus
              />
            </div>
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? dict.saving : dict.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setDeleteOpen(false);
                void runAction(deleteCategoryAction(categoryId), {
                  success: `Category "${categoryName}" deleted.`,
                  error: "Failed to delete category.",
                  undo: {
                    onClick: () =>
                      void runAction(restoreCategoryAction(categoryName, habitIds), {
                        success: `Category "${categoryName}" restored.`,
                        error: "Failed to restore category.",
                      }),
                  },
                });
              }}
            >
              {dict.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
