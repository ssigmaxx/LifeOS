"use client";

import { useState, useTransition } from "react";
import { Apple, Car, ShoppingBag, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { IconBadge, type IconBadgeTone } from "@/components/icon-badge";
import { Timeline, TimelineItem } from "@/components/timeline";
import type { RecentActivityItem } from "@/lib/services/carbon-service";
import { deleteCarbonEntryAction } from "./actions";

const CATEGORY_ICON = { food: Apple, travel: Car, energy: Zap, shopping: ShoppingBag } as const;
const CATEGORY_TONE: Record<keyof typeof CATEGORY_ICON, IconBadgeTone> = {
  food: "lime",
  travel: "cyan",
  energy: "yellow",
  shopping: "violet",
};

function formatDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivityRow({ item, last }: { item: RecentActivityItem; last: boolean }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const Icon = CATEGORY_ICON[item.category];

  return (
    <TimelineItem time={formatDate(item.date)} last={last}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Icon} tone={CATEGORY_TONE[item.category as keyof typeof CATEGORY_ICON]} className="size-7" />
        <p className="min-w-0 flex-1 truncate text-sm">{item.label}</p>
        <p className="shrink-0 text-sm font-medium tabular-nums">
          {item.co2eKg != null ? `${item.co2eKg.toFixed(1)} kg` : "—"}
        </p>
        {item.deletable ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Delete ${item.label}`}
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}

        {item.deletable ? (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{item.label}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive-solid"
                  onClick={() => {
                    setDeleteOpen(false);
                    startTransition(() => deleteCarbonEntryAction(item.category as "travel" | "energy" | "shopping", item.id));
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </TimelineItem>
  );
}

export function RecentActivityList({ items }: { items: RecentActivityItem[] }) {
  return (
    <Timeline>
      {items.map((item, i) => (
        <ActivityRow key={`${item.category}-${item.id}`} item={item} last={i === items.length - 1} />
      ))}
    </Timeline>
  );
}
