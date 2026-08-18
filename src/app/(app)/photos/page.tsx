import { Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  listPhotoDatesByType,
  listPhotos,
  type PhotoWithThumb,
} from "@/lib/services/photo-service";
import { PhotoSlot } from "./photo-slot";
import { Comparison } from "./comparison";

function formatMonthHeading(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function PhotosPage() {
  const [photos, faceDates, bodyDates] = await Promise.all([
    listPhotos(),
    listPhotoDatesByType("face"),
    listPhotoDatesByType("body"),
  ]);

  const byDate = new Map<string, { face?: PhotoWithThumb; body?: PhotoWithThumb }>();
  for (const photo of photos) {
    const entry = byDate.get(photo.photoDate) ?? {};
    entry[photo.photoType] = photo;
    byDate.set(photo.photoDate, entry);
  }

  const byMonth = new Map<string, string[]>();
  for (const date of byDate.keys()) {
    const monthKey = date.slice(0, 7);
    const list = byMonth.get(monthKey) ?? [];
    list.push(date);
    byMonth.set(monthKey, list);
  }
  const sortedMonths = Array.from(byMonth.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>
        <p className="text-sm text-muted-foreground">
          Private progress photos — only you can see these.
        </p>
      </div>

      {photos.length > 0 ? (
        <Card>
          <CardContent>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Compare</h2>
            <Comparison faceDates={faceDates} bodyDates={bodyDates} />
          </CardContent>
        </Card>
      ) : null}

      {sortedMonths.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Images className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No photos yet</p>
              <p className="text-sm text-muted-foreground">
                Add today&apos;s photo from the Today screen.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        sortedMonths.map((monthKey) => {
          const dates = byMonth.get(monthKey)!.sort((a, b) => (a < b ? 1 : -1));
          return (
            <div key={monthKey} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {formatMonthHeading(monthKey)}
              </h2>
              <div className="flex flex-wrap gap-4">
                {dates.map((date) => {
                  const entry = byDate.get(date)!;
                  return (
                    <div key={date} className="flex flex-col items-center gap-1.5">
                      <div className="flex gap-2">
                        {entry.face ? (
                          <PhotoSlot
                            photoId={entry.face.id}
                            photoDate={date}
                            photoType="face"
                            label="Face"
                            thumbnailUrl={entry.face.thumbnailUrl}
                          />
                        ) : null}
                        {entry.body ? (
                          <PhotoSlot
                            photoId={entry.body.id}
                            photoDate={date}
                            photoType="body"
                            label="Body"
                            thumbnailUrl={entry.body.thumbnailUrl}
                          />
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">{date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
