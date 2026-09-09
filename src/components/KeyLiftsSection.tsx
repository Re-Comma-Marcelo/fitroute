import { useEffect, useState } from "react";
import { Minus, Plus, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LiftTrend } from "@/lib/progress-analytics";
import type { Exercise } from "@/lib/types";
import { relativeDays, weightUnitLabel } from "@/lib/format";
import { clearLiftGoal, getLiftGoals, goalProgress, setLiftGoal } from "@/lib/lift-goals";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { cn } from "@/lib/utils";

export interface KeyLiftRow {
 exercise: Exercise;
 trend: LiftTrend | null;
}

export function KeyLiftsSection({
 rows,
 onAdd,
 onRemove,
}: {
 rows: KeyLiftRow[];
 onAdd: () => void;
 onRemove: (exerciseId: string) => void;
}) {
 const t = useT();
 const { unit } = useWeightUnit();
 const [goals, setGoals] = useState<Record<string, number>>({});
 const [editing, setEditing] = useState<string | null>(null);
 const [draft, setDraft] = useState("");

 // Goals live in localStorage: a personal target, not logged training data.
 useEffect(() => {
 const stored = getLiftGoals();
 setGoals(Object.fromEntries(Object.entries(stored).map(([id, goal]) => [id, goal.targetKg])));
 }, []);

 function saveGoal(exerciseId: string) {
 const parsed = Number(draft.replace(",", "."));
 if (!Number.isFinite(parsed) || parsed <= 0) {
 clearLiftGoal(exerciseId);
 setGoals((prev) => {
 const next = { ...prev };
 delete next[exerciseId];
 return next;
 });
 } else {
 const targetKg = Math.round(fromDisplayWeight(parsed, unit) * 10) / 10;
 setLiftGoal({ exerciseId, metric: "load", targetKg });
 setGoals((prev) => ({ ...prev, [exerciseId]: targetKg }));
 }
 setEditing(null);
 setDraft("");
 }
 return (
 <section className="mt-8">
 <header className="mb-3 flex items-center justify-between">
 <h2 className="label-caps">{t("Key lifts")}</h2>
 <button
 type="button"
 onClick={onAdd}
 aria-label={t("Track a lift")}
 className="tap-target flex items-center gap-1 rounded-sm border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
 >
 <Plus className="size-4" /> {t("Track a lift")}
 </button>
 </header>

 {rows.length === 0 ? (
 <button
 type="button"
 onClick={onAdd}
 className="w-full rounded-lg border border-dashed border-border p-5 text-left"
 >
 <p className="font-display text-sm font-semibold">{t("Pick the lifts you care about")}</p>
 <p className="mt-1 text-xs leading-snug text-muted-foreground">
 {t(
 "Track bench, squat or anything else and see whether the load is actually going up.",
 )}
 </p>
 </button>
 ) : (
 <ul className="space-y-2">
 {rows.map(({ exercise, trend }) => (
 <li key={exercise.id} className="rounded-lg border border-border bg-card p-3">
 <div className="flex items-center gap-3">
 <ExerciseThumb grupo={exercise.grupoPrimario} nome={exercise.nome} />
 <div className="min-w-0 flex-1">
 <p className="truncate font-display text-sm font-semibold leading-tight">
 {exercise.nome}
 </p>
 {trend ? (
 <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
 {trend.spanWeeks === 1
 ? t("{firstWeight}kg → {lastWeight}kg · {spanWeeks} week · {date}", {
 firstWeight: trend.firstWeight,
 lastWeight: trend.lastWeight,
 spanWeeks: trend.spanWeeks,
 date: relativeDays(trend.lastDate),
 })
 : t("{firstWeight}kg → {lastWeight}kg · {spanWeeks} weeks · {date}", {
 firstWeight: trend.firstWeight,
 lastWeight: trend.lastWeight,
 spanWeeks: trend.spanWeeks,
 date: relativeDays(trend.lastDate),
 })}
 </p>
 ) : (
 <p className="mt-0.5 text-xs text-muted-foreground">
 {t("No sets logged yet")}
 </p>
 )}
 </div>

 {trend ? <Sparkline points={trend.points} direction={trend.direction} /> : null}
 {trend ? <DirectionChip trend={trend} /> : null}

 <button
 type="button"
 onClick={() => onRemove(exercise.id)}
 aria-label={t("Stop tracking {name}", { name: exercise.nome })}
 className="tap-target -mr-1 flex w-8 items-center justify-center text-muted-foreground/60 transition-colors hover:text-foreground"
 >
 <X className="size-4" />
 </button>
 </div>

 <GoalRow
 best={trend ? Math.max(...trend.points) : 0}
 goalKg={goals[exercise.id] ?? null}
 editing={editing === exercise.id}
 draft={draft}
 unit={unit}
 onDraft={setDraft}
 onEdit={() => {
 setEditing(exercise.id);
 const current = goals[exercise.id];
 setDraft(
 current ? String(Math.round(toDisplayWeight(current, unit) * 10) / 10) : "",
 );
 }}
 onCancel={() => setEditing(null)}
 onSave={() => saveGoal(exercise.id)}
 />
 </li>
 ))}
 </ul>
 )}
 </section>
 );
}

/** Target load for the lift: "best so far vs the number you're chasing". */
function GoalRow({
 best,
 goalKg,
 editing,
 draft,
 unit,
 onDraft,
 onEdit,
 onCancel,
 onSave,
}: {
 best: number;
 goalKg: number | null;
 editing: boolean;
 draft: string;
 unit: "kg" | "lb";
 onDraft: (value: string) => void;
 onEdit: () => void;
 onCancel: () => void;
 onSave: () => void;
}) {
 const t = useT();

 if (editing) {
 return (
 <div className="mt-3 flex items-center gap-2">
 <Input
 value={draft}
 autoFocus
 inputMode="decimal"
 placeholder={t("Target in {unit}", { unit: weightUnitLabel() })}
 aria-label={t("Target in {unit}", { unit: weightUnitLabel() })}
 onChange={(e) => onDraft(e.target.value)}
 className="numeric-field h-11 flex-1"
 />
 <Button className="tap-target" onClick={onSave}>
 {t("Save")}
 </Button>
 <Button variant="ghost" className="tap-target" onClick={onCancel}>
 {t("Cancel")}
 </Button>
 </div>
 );
 }

 if (goalKg === null) {
 return (
 <button
 type="button"
 onClick={onEdit}
 className="tap-target mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
 >
 <Target className="size-4" /> {t("Set a goal")}
 </button>
 );
 }

 const pct = goalProgress(best, goalKg);
 const target = Math.round(toDisplayWeight(goalKg, unit) * 10) / 10;
 const current = Math.round(toDisplayWeight(best, unit) * 10) / 10;
 return (
 <button type="button" onClick={onEdit} className="mt-3 block w-full text-left">
 <div className="flex items-baseline justify-between text-xs font-semibold tabular-nums">
 <span className="text-muted-foreground">
 {t("Goal {target} {unit}", { target, unit: weightUnitLabel() })}
 </span>
 <span className={cn(pct >= 100 ? "text-violet" : "text-foreground")}>
 {t("{current} {unit} · {pct}%", { current, unit: weightUnitLabel(), pct })}
 </span>
 </div>
 <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-surface-3">
 <div
 className={cn("h-full rounded-sm", pct >= 100 ? "bg-violet" : "bg-primary")}
 style={{ width: `${pct}%` }}
 />
 </div>
 </button>
 );
}

function DirectionChip({ trend }: { trend: LiftTrend }) {
 const diff = Math.round((trend.lastWeight - trend.firstWeight) * 10) / 10;
 const Icon =
 trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
 return (
 <span
 className={cn(
 "flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-semibold tabular-nums",
 trend.direction === "up" && "bg-emerald-500/15 text-emerald-400",
 trend.direction === "down" && "bg-oxide/15 text-oxide",
 trend.direction === "flat" && "bg-muted text-muted-foreground",
 )}
 >
 <Icon className="size-3.5" />
 {diff > 0 ? `+${diff}` : diff}
 </span>
 );
}

function Sparkline({ points, direction }: { points: number[]; direction: LiftTrend["direction"] }) {
 if (points.length < 2) return null;
 const w = 44;
 const h = 20;
 const min = Math.min(...points);
 const max = Math.max(...points);
 const span = max - min || 1;
 const d = points
 .map((p, i) => {
 const x = (i / (points.length - 1)) * w;
 const y = h - ((p - min) / span) * h;
 return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
 })
 .join(" ");
 const stroke =
 direction === "up"
 ? "rgb(52 211 153)"
 : direction === "down"
 ? "var(--destructive)"
 : "var(--muted-foreground)";
 return (
 <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
 <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" />
 </svg>
 );
}
