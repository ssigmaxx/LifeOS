import { Check, X } from "lucide-react";
import type { DayDetail } from "@/lib/services/analytics-service";

function formatEventTime(startAt: string, isAllDay: boolean) {
  if (isAllDay) return "All day";
  return new Date(startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function DayDetailContent({ detail }: { detail: DayDetail }) {
  return (
    <div className="space-y-3">
      <p className="text-2xl font-semibold tracking-tight">
        {detail.score != null ? `${Math.round(detail.score * 100)}%` : "—"}
      </p>

      {detail.events.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Events</p>
          <ul className="divide-y">
            {detail.events.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="flex-1 truncate">{e.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatEventTime(e.startAt, e.isAllDay)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.todos.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Todos</p>
          <ul className="divide-y">
            {detail.todos.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="flex-1 truncate">{t.title}</span>
                {t.completed ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <X className="size-4 text-muted-foreground" />
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Habits</p>
        {detail.habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing was scheduled this day.</p>
        ) : (
          <ul className="divide-y">
            {detail.habits.map((h) => (
              <li key={h.id} className="flex items-center gap-2 py-1.5 text-sm">
                {h.icon ? <span>{h.icon}</span> : null}
                <span className="flex-1">{h.name}</span>
                {h.completed ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <X className="size-4 text-muted-foreground" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {detail.events.length === 0 && detail.todos.length === 0 && detail.habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing tracked this day.</p>
      ) : null}
    </div>
  );
}
