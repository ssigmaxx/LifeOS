"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PhotoType } from "@/lib/services/photo-service";
import { getComparisonPhotoUrlAction } from "./actions";

function DateSelect({
  dates,
  value,
  onChange,
  placeholder,
}: {
  dates: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {dates.map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ComparisonSlot({ photoType, date }: { photoType: PhotoType; date: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    startLoading(async () => {
      const u = await getComparisonPhotoUrlAction(date, photoType);
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [date, photoType]);

  if (!date) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Pick a date
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No photo
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${photoType} photo from ${date}`}
      className="aspect-[3/4] w-full rounded-lg border object-cover"
    />
  );
}

export function Comparison({
  faceDates,
  bodyDates,
}: {
  faceDates: string[];
  bodyDates: string[];
}) {
  const [type, setType] = useState<PhotoType>("face");
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");
  const dates = type === "face" ? faceDates : bodyDates;

  if (faceDates.length === 0 && bodyDates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType("face");
            setDateA("");
            setDateB("");
          }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === "face" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Face
        </button>
        <button
          type="button"
          onClick={() => {
            setType("body");
            setDateA("");
            setDateB("");
          }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === "body" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Body
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <DateSelect dates={dates} value={dateA} onChange={setDateA} placeholder="Before" />
          <ComparisonSlot photoType={type} date={dateA} />
        </div>
        <div className="space-y-2">
          <DateSelect dates={dates} value={dateB} onChange={setDateB} placeholder="After" />
          <ComparisonSlot photoType={type} date={dateB} />
        </div>
      </div>
    </div>
  );
}
