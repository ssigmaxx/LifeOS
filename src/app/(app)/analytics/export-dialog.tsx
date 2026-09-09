"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DATASETS = [
  { id: "habits", label: "Habits & categories" },
  { id: "habitLogs", label: "Habit logs" },
  { id: "goals", label: "Goals & milestones" },
  { id: "todos", label: "Todos" },
  { id: "journal", label: "Journal entries" },
  { id: "savedFoods", label: "Saved foods" },
  { id: "budget", label: "Budget categories" },
] as const;

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => isoDaysAgo(90));
  const [end, setEnd] = useState(TODAY_ISO);
  const [datasets, setDatasets] = useState<Set<string>>(() => new Set(DATASETS.map((d) => d.id)));
  const [format, setFormat] = useState<"json" | "csv">("json");

  function toggleDataset(id: string) {
    setDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runExport() {
    const params = new URLSearchParams({ start, end, format, datasets: Array.from(datasets).join(",") });
    // A real browser navigation, not a Next.js route transition — /api/export
    // returns a Content-Disposition: attachment response, which the browser
    // downloads without actually leaving this page.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/export?${params.toString()}`;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Download className="size-4" /> Export data
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>Choose a time window, what to include, and a format.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="export-start">From</Label>
              <Input
                id="export-start"
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-end">To</Label>
              <Input id="export-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The window only applies to habit logs and journal entries. Habits, goals, todos, saved foods, and
            budget categories are current-state data, so they&apos;re always included in full.
          </p>

          <div className="space-y-2">
            <Label>What to include</Label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {DATASETS.map((d) => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={datasets.has(d.id)} onCheckedChange={() => toggleDataset(d.id)} />
                  {d.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "json" | "csv")}>
              <SelectTrigger id="export-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={runExport} disabled={datasets.size === 0}>
            <Download className="size-4" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
