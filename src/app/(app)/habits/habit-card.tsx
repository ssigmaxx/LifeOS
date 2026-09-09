"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Archive, Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StreakBadge } from "@/components/streak-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Habit, HabitCategory } from "@/lib/services/habit-service";
import {
  archiveHabitAction,
  deleteHabitAction,
  pauseHabitAction,
  resumeHabitAction,
} from "./actions";
import { HabitFormDialog } from "./habit-form-dialog";
import { LogControl } from "./log-control";

type TodayLogValue = {
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueSeconds: number | null;
};

export function HabitCard({
  habit,
  categories,
  todayLog,
}: {
  habit: Habit;
  categories: HabitCategory[];
  todayLog?: TodayLogValue;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className={!habit.isActive ? "opacity-60" : undefined}>
      <CardContent className="flex items-center gap-3 py-1">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
          {habit.icon || "•"}
        </div>
        <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
        <StreakBadge days={habit.streak.currentStreak} className="shrink-0" />

        {habit.isActive ? <LogControl habit={habit} todayLog={todayLog} /> : null}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Habit options" />}>
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            {habit.isActive ? (
              <DropdownMenuItem onClick={() => pauseHabitAction(habit.id)}>
                <Pause className="size-4" /> Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => resumeHabitAction(habit.id)}>
                <Play className="size-4" /> Resume
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => archiveHabitAction(habit.id)}>
              <Archive className="size-4" /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{habit.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the habit and every log recorded for it. This
              can&apos;t be undone — consider archiving instead if you want to keep the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={() => {
                setDeleteOpen(false);
                deleteHabitAction(habit.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HabitFormDialog
        habit={habit}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}
