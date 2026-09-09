import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { getProfile, saveProfile } from "@/lib/data/profile";
import { getRoutines, saveRoutine } from "@/lib/data/routines";
import { getWorkoutLog } from "@/lib/data/workouts";
import { logBodyWeight } from "@/lib/data/body-weight";
import { saveCoachNote } from "@/lib/data/coach-notes";
import { logCoachingEvent } from "@/lib/data/coaching";
import { isoDate } from "@/lib/data/nutrition";
import { sessionsThisWeek, weekStreak, weeklyVolume } from "@/lib/home-metrics";
import { getCheckpoints } from "@/lib/data/route";
import { currentCheckpoint } from "@/lib/route/status";
import { formatDate } from "@/lib/format";
import {
  ISSUE_KEYS,
  assignDays,
  checkInDue,
  checkInFor,
  coachLine,
  planWeekKey,
  saveCheckIn,
  type WeekFeeling,
  type WeeklyCheckIn,
} from "@/lib/coach/weekly-checkin";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const FEELINGS: { key: WeekFeeling; label: string }[] = [
  { key: "strong", label: "Strong" },
  { key: "ok", label: "Okay" },
  { key: "heavy", label: "Heavy" },
];
const ISSUE_LABELS: Record<string, string> = {
  shoulder: "Shoulder",
  back: "Back",
  knee: "Knee",
  tired: "Generally tired",
  nothing: "Nothing",
};

/** Weekend/Monday check-in that turns the week's reality into a plan. */
export function WeeklyCheckInCard() {
  const t = useT();
  const qc = useQueryClient();
  const weekKey = planWeekKey();

  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState<WeekFeeling>("ok");
  const [lifeNote, setLifeNote] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [issueNote, setIssueNote] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<WeeklyCheckIn | null>(null);

  const logQ = useQuery({ queryKey: ["workoutLog"], queryFn: getWorkoutLog });
  const routinesQ = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const checkpointsQ = useQuery({ queryKey: ["route-checkpoints"], queryFn: getCheckpoints });
  // The week is planned against the nearest checkpoint, not in a vacuum.
  const checkpoint = currentCheckpoint(checkpointsQ.data ?? []);

  const last = useMemo(() => {
    const workouts = logQ.data?.workouts ?? [];
    const sets = logQ.data?.sets ?? [];
    const ref = new Date();
    ref.setDate(ref.getDate() - 7);
    return {
      sessions: sessionsThisWeek(workouts, ref),
      volume: weeklyVolume(workouts, sets, ref).current,
      streak: weekStreak(workouts),
    };
  }, [logQ.data]);

  const due = useMemo(() => checkInDue() && !checkInFor(weekKey), [weekKey]);
  if (dismissed || (!due && !done)) return null;

  function toggleDay(day: number) {
    setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  }

  function toggleIssue(key: string) {
    setIssues((list) => {
      if (key === "nothing") return list.includes("nothing") ? [] : ["nothing"];
      const next = list.filter((i) => i !== "nothing");
      return next.includes(key) ? next.filter((i) => i !== key) : [...next, key];
    });
  }

  async function submit() {
    setSaving(true);
    const parsedWeight = Number(weight.replace(",", "."));
    const entry: WeeklyCheckIn = {
      weekKey,
      completedAt: new Date().toISOString(),
      feeling,
      lifeNote: lifeNote.trim(),
      days: [...days].sort((a, b) => a - b),
      issues,
      issueNote: issueNote.trim(),
      weightKg: Number.isFinite(parsedWeight) && parsedWeight > 20 ? parsedWeight : null,
    };

    try {
      saveCheckIn(entry);

      // Weekly goal follows the days the user actually has.
      const profile = profileQ.data;
      if (profile && entry.days.length && profile.metaTreinosSemana !== entry.days.length) {
        await saveProfile({ ...profile, metaTreinosSemana: entry.days.length });
      }

      // Spread the routines over those days so Home and Train propose the right one.
      const planned = assignDays(routinesQ.data ?? [], entry.days);
      for (const routine of planned) await saveRoutine(routine);

      if (entry.weightKg) await logBodyWeight(isoDate(new Date()), entry.weightKg);

      const noteParts = [
        t("Week planned: {days}", {
          days: entry.days.map((d) => t(DAY_LABELS[d] ?? "")).join(", ") || t("no days"),
        }),
        t("Last week felt {feeling}.", {
          feeling: t(FEELINGS.find((f) => f.key === feeling)!.label),
        }),
        entry.lifeNote,
        entry.issues.filter((i) => i !== "nothing").length
          ? t("Watch out for: {issues}", {
              issues: entry.issues.map((i) => t(ISSUE_LABELS[i] ?? i)).join(", "),
            })
          : "",
        entry.issueNote,
      ].filter(Boolean);

      await saveCoachNote({ kind: "checkin", content: noteParts.join(" · "), tags: entry.issues });
      await logCoachingEvent({
        kind: "weekly_checkin",
        cause: "none",
        message: t(coachLine(entry)),
        detail: {
          weekKey,
          days: entry.days.join(","),
          feeling,
          issues: entry.issues.join(","),
          weightKg: entry.weightKg,
        },
      });

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["routines"] }),
        qc.invalidateQueries({ queryKey: ["coach-notes"] }),
        qc.invalidateQueries({ queryKey: ["coaching-events"] }),
        qc.invalidateQueries({ queryKey: ["body-weight"] }),
      ]);
      setDone(entry);
    } catch {
      toast.error(t("Could not save your check-in. Try again."));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    const planned = assignDays(routinesQ.data ?? [], done.days);
    return (
      <Card className="rounded-lg border-border bg-surface-1 p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-sm bg-violet/10 text-violet">
            <Check className="size-4" />
          </span>
          <p className="font-semibold">{t("Your week is planned")}</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Weekly goal: {count} sessions", { count: done.days.length })}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {planned
            .filter((r) => (r.diasSemana ?? []).length)
            .map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate">{r.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {(r.diasSemana ?? []).map((d) => t(DAY_LABELS[d] ?? "")).join(" · ")}
                </span>
              </li>
            ))}
        </ul>
        <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm leading-snug">
          {t(coachLine(done))}
        </p>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setDismissed(true)}>
          {t("Done")}
        </Button>
      </Card>
    );
  }

  const steps = [
    // 1 — last week
    <div key="review" className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("Last week: {sessions} sessions · {volume} kg · {streak} consistent weeks", {
          sessions: last.sessions,
          volume: formatNumber(Math.round(last.volume)),
          streak: last.streak,
        })}
      </p>
      {checkpoint ? (
        <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs leading-snug text-primary">
          {t("Next checkpoint: {title} by {date}", {
            title: checkpoint.title,
            date: formatDate(checkpoint.targetDate),
          })}
        </p>
      ) : null}
      <p className="text-sm font-medium">{t("How did it feel?")}</p>
      <div className="flex gap-2">
        {FEELINGS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFeeling(f.key)}
            className={cn(
              "tap-target flex-1 rounded-lg border px-3 py-2 text-sm font-semibold",
              feeling === f.key ? "border-primary bg-primary/10 text-primary" : "border-border",
            )}
          >
            {t(f.label)}
          </button>
        ))}
      </div>
    </div>,
    // 2 — life
    <div key="life" className="space-y-2">
      <p className="text-sm font-medium">{t("What does your week look like?")}</p>
      <Textarea
        value={lifeNote}
        onChange={(e) => setLifeNote(e.target.value)}
        placeholder={t("School, work, free time, friends...")}
        rows={3}
      />
    </div>,
    // 3 — days
    <div key="days" className="space-y-2">
      <p className="text-sm font-medium">{t("Which days can you train?")}</p>
      <div className="grid grid-cols-7 gap-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggleDay(d)}
            aria-pressed={days.includes(d)}
            className={cn(
              "tap-target rounded-lg border py-2 text-xs font-semibold",
              days.includes(d) ? "border-steel bg-steel/15 text-steel" : "border-border",
            )}
          >
            {t(DAY_LABELS[d] ?? "")}
          </button>
        ))}
      </div>
    </div>,
    // 4 — body
    <div key="issues" className="space-y-2">
      <p className="text-sm font-medium">{t("Any niggles or fatigue?")}</p>
      <div className="flex flex-wrap gap-2">
        {ISSUE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleIssue(key)}
            className={cn(
              "rounded-sm border px-3 py-1.5 text-xs font-semibold",
              issues.includes(key) ? "border-primary bg-primary/10 text-primary" : "border-border",
            )}
          >
            {t(ISSUE_LABELS[key] ?? key)}
          </button>
        ))}
      </div>
      <Textarea
        value={issueNote}
        onChange={(e) => setIssueNote(e.target.value)}
        placeholder={t("Anything else I should know? (optional)")}
        rows={2}
      />
    </div>,
    // 5 — weight
    <div key="weight" className="space-y-2">
      <p className="text-sm font-medium">{t("What do you weigh today?")}</p>
      <Input
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder={t("kg (optional)")}
      />
    </div>,
  ];

  const isLast = step === steps.length - 1;

  return (
    <Card className="rounded-lg border-border bg-surface-1 p-4 ">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-sm bg-primary/15 text-primary">
            <CalendarCheck className="size-4" />
          </span>
          <div>
            <p className="label-caps">{t("Weekly check-in")}</p>
            <p className="text-sm font-semibold">{t("Let's plan your week")}</p>
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {step + 1}/{steps.length}
        </span>
      </div>

      <div className="mt-4">{steps[step]}</div>

      <div className="mt-4 flex gap-2">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            {t("Back")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            {t("Later")}
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={saving || (step === 2 && days.length === 0)}
          onClick={() => (isLast ? void submit() : setStep((s) => s + 1))}
        >
          {isLast ? t("Save my week") : t("Next")}
          {!isLast && <ChevronRight className="ml-1 size-4" />}
        </Button>
      </div>
    </Card>
  );
}
