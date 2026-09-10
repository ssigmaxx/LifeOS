"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Works on both a phone's front/back camera and a laptop webcam — plain
// getUserMedia rather than the file input `capture` attribute, since that
// attribute only opens the OS camera app on mobile and does nothing useful
// on desktop browsers.
export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Resetting to "loading" before starting the getUserMedia() request is
    // the state this effect exists to synchronize — not something that
    // could instead be derived, since the previous open's ready/error state
    // must not leak into a fresh camera request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    setError(null);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Camera access requires a secure (https://) connection.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support camera capture.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Surfacing the real DOMException name/message rather than one
        // generic string — "permission denied," "no camera found," "camera
        // in use by another app," and "insecure context" all need
        // different fixes, and a flat message made this impossible to
        // diagnose without guessing.
        const name = err instanceof DOMException ? err.name : "Error";
        const detail = err instanceof Error ? err.message : String(err);
        const hint =
          name === "NotAllowedError"
            ? "Permission was denied — check your browser and OS camera settings for this site."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : name === "NotReadableError"
                ? "The camera is already in use by another app or browser tab."
                : name === "OverconstrainedError"
                  ? "This device doesn't have that camera — try switching camera."
                  : detail || "Check permissions and try again.";
        setError(`Couldn't access your camera (${name}): ${hint}`);
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
        onOpenChange(false);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
        </DialogHeader>
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-black">
          {error ? (
            <p className="px-6 text-center text-sm text-white">{error}</p>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Switch camera"
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button type="button" onClick={capture} disabled={!ready} className="flex-1">
            Capture
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Cancel"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
