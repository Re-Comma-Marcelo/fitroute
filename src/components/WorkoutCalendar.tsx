import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Workout } from "@/lib/types";
import { formatMonthYear, formatWeekdayShort } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Sunday of the week containing `d`, to match the Sunday-first month grid below. */
function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay());
  return out;
}

/** Trained-days calendar: this week by default, with a toggle to the full month grid. */
export function WorkoutCalendar({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const [view, setView] = useState<"week" | "month">("week");
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

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    formatWeekdayShort(new Date(2024, 0, 7 + i)),
  );
  const todayKey = new Date().toDateString();

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  function renderCell(day: Date) {
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
  }

  if (view === "week") {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="label-caps">{t("This week")}</p>
          <button
            type="button"
            className="text-xs font-semibold text-primary underline-offset-2"
            onClick={() => setView("month")}
          >
            {t("View month")}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((label, i) => (
            <span key={i} className="label-caps text-[10px]">
              {label.slice(0, 2)}
            </span>
          ))}
          {weekDays.map((day) => renderCell(day))}
        </div>
      </section>
    );
  }

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
    ),
  ];

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
        {cells.map((day, i) => (day ? renderCell(day) : <span key={`empty-${i}`} />))}
      </div>

      <button
        type="button"
        className="mt-3 text-xs font-semibold text-primary underline-offset-2"
        onClick={() => {
          setOffset(0);
          setView("week");
        }}
      >
        {t("Back to this week")}
      </button>
    </section>
  );
}
