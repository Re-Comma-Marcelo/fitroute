import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/CountUp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getExercises } from "@/lib/data/exercises";
import { getWorkoutLog, saveWorkout } from "@/lib/data/workouts";
import { formatDate, formatNumber } from "@/lib/format";
import { heatmap, type HeatCell } from "@/lib/home-metrics";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import {
  IGNORE_MARKER,
  buildImport,
  parseHevyCsv,
  resolveExerciseMapping,
  type BuiltImport,
  type ExerciseMapping,
  type HevyParseResult,
} from "@/lib/import/hevy";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "saving" | "done";

export function HevyImportPanel({ onFinished }: { onFinished?: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const logQ = useQuery({ queryKey: ["workoutLog"], queryFn: getWorkoutLog });

  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<HevyParseResult | null>(null);
  const [mapping, setMapping] = useState<ExerciseMapping>({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState({ saved: 0, failed: 0 });

  const library = exercisesQ.data ?? [];
  const existingIds = useMemo(() => (logQ.data?.workouts ?? []).map((w) => w.id), [logQ.data]);

  const built: BuiltImport | null = useMemo(
    () => (parsed ? buildImport(parsed, mapping, existingIds) : null),
    [parsed, mapping, existingIds],
  );

  const cells = useMemo<HeatCell[]>(
    () =>
      built
        ? heatmap(
            built.items.map((i) => i.workout),
            12,
          )
        : [],
    [built],
  );

  const unresolved = Object.keys(mapping).filter((k) => mapping[k] === null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const next = parseHevyCsv(text);
      if (next.warnings.includes("MISSING_COLUMNS")) {
        setError(t("This file does not look like a Hevy export."));
        return;
      }
      if (next.workouts.length === 0) {
        setError(t("No workouts found in this file."));
        return;
      }
      if (next.warnings.includes("NO_WEIGHT_COLUMN")) {
        toast.warning(t("This export has no weight column — sets will import without load."));
      }
      setParsed(next);
      setMapping(resolveExerciseMapping(next.titles, library));
      setStep("preview");
    } catch {
      setError(t("Could not read this file."));
    }
  }

  async function confirm() {
    if (!built) return;
    setStep("saving");
    setProgress({ current: 0, total: built.items.length });
    let saved = 0;
    let failed = 0;
    for (let i = 0; i < built.items.length; i++) {
      const item = built.items[i]!;
      try {
        await saveWorkout(item.workout, item.sets);
        saved++;
      } catch {
        failed++;
      }
      setProgress({ current: i + 1, total: built.items.length });
    }
    setResult({ saved, failed });
    await queryClient.invalidateQueries({ queryKey: ["workoutLog"] });
    setStep("done");
  }

  /* ---------------------------------------------------------------- upload */

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border-border bg-card p-4">
          <p className="label-caps">{t("Step 1 of 3")}</p>
          <h2 className="mt-1 text-lg font-semibold">{t("Bring your Hevy history")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("In Hevy: Profile → Settings → Export & Import Data → Export Workouts.")}
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="tap-target mt-4 w-full gap-2"
          >
            <FileUp className="size-4" />
            {t("Choose CSV file")}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("Nothing is saved until you confirm.")}
          </p>
        </Card>
        {error ? <p className="text-sm font-semibold text-oxide">{error}</p> : null}
      </div>
    );
  }

  /* --------------------------------------------------------------- preview */

  if (step === "preview" && built) {
    const s = built.stats;
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border-border bg-card p-4">
          <p className="label-caps">{t("Step 2 of 3")}</p>
          <h2 className="mt-1 text-lg font-semibold">{t("Here is what we found")}</h2>

          <div className="mt-4">
            <p className="label-caps text-steel">{t("Total volume")}</p>
            <p className="num-hero text-steel">
              <CountUp value={s.volumeKg} format={(n) => formatNumber(n)} />
              <span className="ml-1 text-base font-semibold">kg</span>
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <PreviewStat label={t("Workouts")} value={s.workouts} />
            <PreviewStat label={t("Sets")} value={s.sets} />
            <PreviewStat label={t("PRs")} value={s.prs} />
          </dl>

          {s.from ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("Covering {from} → {to}", { from: formatDate(s.from), to: formatDate(s.to) })}
            </p>
          ) : null}

          <div className="mt-4">
            <p className="label-caps">{t("Consistency")}</p>
            <div className="mt-2 grid grid-flow-col grid-rows-7 gap-1">
              {cells.map((cell) => (
                <span
                  key={cell.date}
                  className={cn(
                    "size-3 rounded-[3px]",
                    cell.level === 0
                      ? "bg-surface-3"
                      : cell.level === 1
                        ? "bg-steel/40"
                        : "bg-steel",
                  )}
                />
              ))}
            </div>
          </div>

          {s.skippedRows > 0 || s.duplicates > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("{skipped} row(s) skipped · {dupes} workout(s) already imported", {
                skipped: s.skippedRows,
                dupes: s.duplicates,
              })}
            </p>
          ) : null}
        </Card>

        {unresolved.length > 0 ? (
          <Card className="rounded-lg border-border bg-card p-4">
            <p className="label-caps text-warn">{t("Unrecognized exercises")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Pick a match from your library or skip it. No new exercises are created.")}
            </p>
            <ul className="mt-3 space-y-3">
              {unresolved.map((title) => (
                <li key={title}>
                  <p className="truncate text-sm font-semibold">{title}</p>
                  <Select onValueChange={(value) => setMapping((m) => ({ ...m, [title]: value }))}>
                    <SelectTrigger className="tap-target mt-1.5 h-11 w-full">
                      <SelectValue placeholder={t("Choose an exercise")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE_MARKER}>{t("Skip this exercise")}</SelectItem>
                      {library.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Button
          type="button"
          onClick={confirm}
          disabled={built.items.length === 0}
          className="tap-target w-full gap-2"
        >
          <Upload className="size-4" />
          {t("Import {n} workouts", { n: built.items.length })}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="tap-target w-full"
          onClick={() => {
            setParsed(null);
            setStep("upload");
          }}
        >
          {t("Choose another file")}
        </Button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- saving */

  if (step === "saving") {
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return (
      <Card className="rounded-lg border-border bg-card p-6 text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm font-semibold">
          {t("Saving {current} of {total}", { current: progress.current, total: progress.total })}
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-surface-3">
          <div
            className="h-full rounded-sm bg-primary transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>
    );
  }

  /* ------------------------------------------------------------------ done */

  return (
    <Card className="rounded-lg border-border bg-card p-6 text-center">
      <CheckCircle2 className="mx-auto size-7 text-violet" />
      <h2 className="mt-3 text-lg font-semibold">{t("History imported")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("{saved} workout(s) added.", { saved: result.saved })}
        {result.failed > 0
          ? ` ${t("{failed} could not be saved.", { failed: result.failed })}`
          : ""}
      </p>
      <Button type="button" className="tap-target mt-4 w-full" onClick={() => onFinished?.()}>
        {t("Go to dashboard")}
      </Button>
    </Card>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-3/60 py-2">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
        <CountUp value={value} />
      </dd>
    </div>
  );
}
