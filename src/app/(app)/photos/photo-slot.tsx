"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import type { PhotoType } from "@/lib/services/photo-service";
import { deletePhotoAction, getFullPhotoUrlAction, uploadPhotoAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

export function PhotoSlot({
  photoId,
  photoDate,
  photoType,
  label,
  thumbnailUrl,
}: {
  photoId: string | null;
  photoDate: string;
  photoType: PhotoType;
  label: string;
  thumbnailUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(uploadPhotoAction, initialState);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  async function openViewer() {
    if (!photoId) return;
    setViewOpen(true);
    setLoadingFull(true);
    try {
      const url = await getFullPhotoUrlAction(photoId);
      setFullUrl(url);
    } finally {
      setLoadingFull(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="photoDate" value={photoDate} />
        <input type="hidden" name="photoType" value={photoType} />
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/*"
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </form>

      {thumbnailUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived, dynamic URLs aren't a fit for next/image's static optimization */}
          <img
            src={thumbnailUrl}
            alt={`${label} progress photo`}
            onClick={openViewer}
            className="size-20 cursor-pointer rounded-lg border object-cover"
          />
          <button
            type="button"
            aria-label={`Delete ${label} photo`}
            onClick={() => setDeleteOpen(true)}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-accent"
        >
          <Camera className="size-5" />
          <span className="text-[10px]">{isPending ? "Uploading…" : "Add"}</span>
        </button>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
      {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setDeleteOpen(false);
                deletePhotoAction(photoDate, photoType);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {label} · {photoDate}
            </DialogTitle>
          </DialogHeader>
          {loadingFull ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : fullUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fullUrl} alt={`${label} progress photo`} className="w-full rounded-lg" />
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setViewOpen(false);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
