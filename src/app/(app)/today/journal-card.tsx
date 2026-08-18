"use client";

import { useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { JournalEntry } from "@/lib/services/journal-service";
import { MorningEntryForm } from "@/app/(app)/journal/morning-entry-form";
import { EveningEntryForm } from "@/app/(app)/journal/evening-entry-form";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function JournalCard({
  morning,
  evening,
}: {
  morning: JournalEntry | null;
  evening: JournalEntry | null;
}) {
  const [openDialog, setOpenDialog] = useState<"morning" | "evening" | null>(null);
  const entryDate = todayISO();

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <BookOpen className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Journal</p>
          <p className="text-xs text-muted-foreground">
            Morning {morning ? "done" : "not logged"} · Evening {evening ? "done" : "not logged"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={morning ? "default" : "outline"}
            onClick={() => setOpenDialog("morning")}
          >
            {morning ? <Check className="size-4" /> : null}
            Morning
          </Button>
          <Button
            type="button"
            size="sm"
            variant={evening ? "default" : "outline"}
            onClick={() => setOpenDialog("evening")}
          >
            {evening ? <Check className="size-4" /> : null}
            Evening
          </Button>
        </div>
      </CardContent>

      <Dialog open={openDialog === "morning"} onOpenChange={(o) => setOpenDialog(o ? "morning" : null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Morning journal</DialogTitle>
            <DialogDescription>Start the day with intention.</DialogDescription>
          </DialogHeader>
          <MorningEntryForm
            key={morning?.id ?? "new"}
            entryDate={entryDate}
            entry={morning}
            onSaved={() => setOpenDialog(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "evening"} onOpenChange={(o) => setOpenDialog(o ? "evening" : null)}>
        <DialogContent className={cn("max-h-[90vh] overflow-y-auto sm:max-w-sm")}>
          <DialogHeader>
            <DialogTitle>Evening journal</DialogTitle>
            <DialogDescription>Reflect on the day.</DialogDescription>
          </DialogHeader>
          <EveningEntryForm
            key={evening?.id ?? "new"}
            entryDate={entryDate}
            entry={evening}
            onSaved={() => setOpenDialog(null)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
