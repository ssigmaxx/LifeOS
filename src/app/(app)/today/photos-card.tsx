import { Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge } from "@/components/icon-badge";
import type { PhotoWithThumb } from "@/lib/services/photo-service";
import { PhotoSlot } from "@/app/(app)/photos/photo-slot";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PhotosCard({
  face,
  body,
}: {
  face: PhotoWithThumb | null;
  body: PhotoWithThumb | null;
}) {
  const photoDate = todayISO();

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <IconBadge icon={Images} tone="pink" />
        <p className="text-sm font-medium">Photos</p>
        <div className="ml-auto flex items-center gap-4">
          <PhotoSlot
            photoId={face?.id ?? null}
            photoDate={photoDate}
            photoType="face"
            label="Face"
            thumbnailUrl={face?.thumbnailUrl ?? null}
          />
          <PhotoSlot
            photoId={body?.id ?? null}
            photoDate={photoDate}
            photoType="body"
            label="Body"
            thumbnailUrl={body?.thumbnailUrl ?? null}
          />
        </div>
      </CardContent>
    </Card>
  );
}
