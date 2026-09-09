import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";
import { formatDate, formatKg } from "@/lib/format";
import { personalRecords } from "@/lib/records";
import type { Exercise, Workout, WorkoutSet } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Every lift's best load and best estimated 1RM, in one place. */
export function PersonalRecordsCard({
 workouts,
 sets,
 exercises,
}: {
 workouts: Workout[];
 sets: WorkoutSet[];
 exercises: Exercise[];
}) {
 const t = useT();
 const [sort, setSort] = useState<"recent" | "e1rm">("recent");
 const [expanded, setExpanded] = useState(false);

 const rows = useMemo(() => {
 const base = personalRecords(sets, workouts).filter((r) =>
 exercises.some((e) => e.id === r.exerciseId),
 );
 return sort === "recent" ? base : [...base].sort((a, b) => b.bestE1rm - a.bestE1rm);
 }, [sets, workouts, exercises, sort]);

 if (!rows.length) return null;
 const visible = expanded ? rows : rows.slice(0, 5);

 return (
 <section className="mt-4 rounded-lg border border-border bg-card p-4">
 <header className="flex items-center justify-between gap-2">
 <h2 className="label-caps flex items-center gap-1.5">
 <Trophy className="size-3.5 text-steel" /> {t("Personal records")}
 </h2>
 <div className="flex rounded-sm border border-border p-0.5">
 {(["recent", "e1rm"] as const).map((option) => (
 <button
 key={option}
 type="button"
 onClick={() => setSort(option)}
 className={cn(
 "rounded-sm px-3 py-1 text-[11px] font-semibold transition-colors",
 sort === option ? "bg-primary text-primary-foreground" : "text-muted-foreground",
 )}
 >
 {option === "recent" ? t("Recent") : t("Strongest")}
 </button>
 ))}
 </div>
 </header>

 <ul className="mt-3 divide-y divide-border/60">
 {visible.map((row) => {
 const exercise = exercises.find((e) => e.id === row.exerciseId);
 return (
 <li key={row.exerciseId} className="flex items-center gap-3 py-2.5 first:pt-0">
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold leading-tight">{exercise?.nome}</p>
 <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
 {t("{weight} × {reps}", {
 weight: formatKg(row.bestWeight),
 reps: row.bestWeightReps,
 })}
 {row.date ? ` · ${formatDate(row.date)}` : ""}
 </p>
 </div>
 <p className="shrink-0 text-right">
 <span className="font-display block text-sm font-semibold tabular-nums text-steel">
 {formatKg(row.bestE1rm)}
 </span>
 <span className="label-caps">{t("e1RM")}</span>
 </p>
 </li>
 );
 })}
 </ul>

 {rows.length > 5 ? (
 <button
 type="button"
 onClick={() => setExpanded((v) => !v)}
 className="tap-target mt-1 text-xs font-semibold text-primary"
 >
 {expanded ? t("Show less") : t("Show all {count}", { count: rows.length })}
 </button>
 ) : null}
 </section>
 );
}
