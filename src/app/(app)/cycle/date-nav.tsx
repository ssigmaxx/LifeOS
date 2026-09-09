"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function shiftDate(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const todayISO = new Date().toISOString().slice(0, 10);

  function go(next: string) {
    router.push(`/cycle?date=${next}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="icon-sm" variant="outline" aria-label="Previous day" onClick={() => go(shiftDate(date, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <Input
        type="date"
        value={date}
        max={todayISO}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="w-40"
      />
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Next day"
        disabled={date >= todayISO}
        onClick={() => go(shiftDate(date, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
      {date !== todayISO ? (
        <Button size="sm" variant="ghost" onClick={() => go(todayISO)}>
          Today
        </Button>
      ) : null}
    </div>
  );
}
