import { toast } from "sonner";

type RunActionOptions = {
  /** Shown on success. Omit to stay silent on success (e.g. very frequent actions). */
  success?: string;
  /** Shown on failure. Defaults to the thrown error's message. */
  error?: string;
  /** Adds an "Undo" (or custom-labeled) button to the success toast. */
  undo?: { label?: string; onClick: () => void };
};

/**
 * Awaits a fire-and-forget server action call and reports the outcome as a
 * toast. Most dropdown-menu actions in this app (pause, archive, delete,
 * toggle…) call a server action directly from an onClick with no error
 * handling — a thrown error there becomes a silent unhandled rejection, so
 * the user sees the dialog close but nothing actually happened. Wrapping
 * the call in this fixes that and gives create/delete/etc. actions
 * consistent success feedback.
 */
export async function runAction(promise: Promise<void>, options: RunActionOptions = {}): Promise<void> {
  try {
    await promise;
    if (options.success) {
      toast.success(
        options.success,
        options.undo ? { action: { label: options.undo.label ?? "Undo", onClick: options.undo.onClick } } : undefined,
      );
    }
  } catch (err) {
    toast.error(options.error ?? (err instanceof Error ? err.message : "Something went wrong."));
  }
}
