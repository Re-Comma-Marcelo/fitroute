import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Workout } from "@/lib/types";
import { formatMonthYear, formatWeekdayShort } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Month grid of trained days: density at a glance, tap a day to open it. */
export function WorkoutCalendar({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const [offset, setOffset] = useState(0);

  const month = useMemo(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth() + offset, 1);
  }, [offset]);

  const byDay = useMemo(() => {
    const map = new Map<string, Workout>();
    workouts.forEach((w) => {
      const key = new Date(w.iniciadoEm).toDateString();
      if (!map.has(key)) map.set(key, w);
    });
    return map;
  }, [workouts]);

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
    ),
  ];

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    formatWeekdayShort(new Date(2024, 0, 7 + i)),
  );
  const todayKey = new Date().toDateString();

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t("Previous month")}
          className="tap-target rounded-full px-2 text-muted-foreground"
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-display text-sm font-semibold first-letter:uppercase">
          {formatMonthYear(month)}
        </p>
        <button
          type="button"
          aria-label={t("Next month")}
          disabled={offset >= 0}
          className="tap-target rounded-full px-2 text-muted-foreground disabled:opacity-30"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </header>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="label-caps text-[10px]">
            {label.slice(0, 2)}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />;
          const workout = byDay.get(day.toDateString());
          const isToday = day.toDateString() === todayKey;
          const content = (
            <span
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-xs tabular-nums",
                workout ? "bg-primary/20 font-semibold text-primary" : "text-muted-foreground/60",
                isToday && "ring-1 ring-primary/60",
              )}
            >
              {day.getDate()}
            </span>
          );
          return workout ? (
            <Link
              key={day.toISOString()}
              to="/progresso/$id"
              params={{ id: workout.id }}
              aria-label={day.toDateString()}
            >
              {content}
            </Link>
          ) : (
            <span key={day.toISOString()}>{content}</span>
          );
        })}
      </div>
    </section>
  );
}
