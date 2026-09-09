"use client";

import { useActionState, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { deleteCategoryAction, renameCategoryAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function CategoryMenu({
  categoryId,
  categoryName,
  dict,
}: {
  categoryId: string;
  categoryName: string;
  dict: Dictionary;
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
            <Pencil className="size-4" /> {dict.habits.categoryMenu.rename}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> {dict.habits.categoryMenu.deleteCategory}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dict.habits.categoryMenu.renameTitle}</DialogTitle>
            <DialogDescription>{dict.habits.categoryMenu.renameDescription}</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`rename-${categoryId}`}>{dict.habits.categoryMenu.nameLabel}</Label>
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
                {isPending ? dict.habits.categoryMenu.saving : dict.habits.categoryMenu.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.habits.categoryMenu.deleteTitle(categoryName)}</AlertDialogTitle>
            <AlertDialogDescription>{dict.habits.categoryMenu.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.habits.categoryMenu.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setDeleteOpen(false);
                deleteCategoryAction(categoryId);
              }}
            >
              {dict.habits.categoryMenu.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
