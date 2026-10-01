import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useFolderActions } from "@/components/folders/use-folder-actions";
import {
  closeFolderAsTemplate,
  isStandard,
  nextCycleName,
  recurringSwaps,
  referenceLoads,
} from "@/lib/data/folders";
import { formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Exercise, Routine, TrainingFolder, Workout, WorkoutSet } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Close a cycle in three steps: keep the swaps that stuck, save the reference
 * loads, and (for the current folder) start the next block. The folder turns
 * into a template; its sessions stay where they are.
 */
export function CloseCycleSheet({
  open,
  onOpenChange,
  folder,
  routines,
  workouts,
  sets,
  exercises,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: TrainingFolder;
  /** The folder's routines. */
  routines: Routine[];
  /** The folder's sessions. */
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  onClosed?: () => void;
}) {
  const t = useT();
  const { refreshFolderViews } = useFolderActions();
  const isCurrent = folder.status === "atual";
  const hasVariations = routines.some((r) => !isStandard(r));

  const candidates = useMemo(
    () => recurringSwaps(routines, workouts, sets),
    [routines, workouts, sets],
  );
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [saveLoads, setSaveLoads] = useState(true);
  const [nextName, setNextName] = useState("");
  const [fromTemplate, setFromTemplate] = useState(true);
  const [withVariations, setWithVariations] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSkipped(new Set());
    setSaveLoads(true);
    setNextName(nextCycleName(folder.nome));
    setFromTemplate(true);
    setWithVariations(false);
  }, [open, folder.nome]);

  const keyOf = (s: { routineId: string; from: string }) => `${s.routineId}:${s.from}`;
  const chosen = useMemo(
    () => candidates.filter((s) => !skipped.has(`${s.routineId}:${s.from}`)),
    [candidates, skipped],
  );
  const nameOf = (id: string) => exercises.find((e) => e.id === id)?.nome ?? t("Exercise");

  /** Exercises of the standard routines as they will be in the template. */
  const templateExercises = useMemo(() => {
    const ids: string[] = [];
    for (const r of routines.filter(isStandard)) {
      for (const ex of [...r.exercicios].sort((a, b) => a.ordem - b.ordem)) {
        const swap = chosen.find((s) => s.routineId === r.id && s.from === ex.exerciseId);
        ids.push(swap?.to ?? ex.exerciseId);
      }
    }
    return [...new Set(ids)];
  }, [routines, chosen]);
  const loads = useMemo(
    () => referenceLoads(templateExercises, workouts, sets),
    [templateExercises, workouts, sets],
  );

  const steps = isCurrent ? 3 : 2;
  const last = step === steps - 1;

  async function confirm() {
    if (isCurrent && !nextName.trim()) return;
    setBusy(true);
    try {
      const { next } = await closeFolderAsTemplate({
        folder,
        routines,
        swaps: chosen,
        loads: saveLoads ? loads : null,
        ...(isCurrent
          ? {
              next: {
                nome: nextName.trim(),
                fromTemplate,
                withVariations: fromTemplate && withVariations,
              },
            }
          : {}),
      });
      await refreshFolderViews();
      toast.success(
        next
          ? t("{template} saved as a template. {next} is your current folder.", {
              template: folder.nome,
              next: next.nome,
            })
          : t("{template} saved as a template.", { template: folder.nome }),
      );
      onOpenChange(false);
      onClosed?.();
    } catch {
      toast.error(t("Could not close the cycle. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isCurrent ? t("Close cycle") : t("Save as template")}</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Step {n} of {total}", { n: step + 1, total: steps })}
        </p>

        {step === 0 ? (
          <section className="mt-4">
            <p className="font-display text-base font-semibold">{t("Swaps that stuck")}</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {t(
                "Swapped in at least half of a routine's sessions. Checked swaps become the template's standard.",
              )}
            </p>
            {candidates.length ? (
              <ul className="mt-3 space-y-2">
                {candidates.map((s) => {
                  const key = keyOf(s);
                  const checked = !skipped.has(key);
                  return (
                    <li key={key}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setSkipped((prev) => {
                              const next = new Set(prev);
                              if (v) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-muted-foreground">
                            {s.routineNome}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm">
                            <span className="truncate text-muted-foreground">{nameOf(s.from)}</span>
                            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-semibold">{nameOf(s.to)}</span>
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {t("{count} of {total} sessions", { count: s.count, total: s.total })}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                {t("No swap repeated enough to change the standard.")}
              </p>
            )}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold">{t("Reference loads")}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {t(
                    "Your best set in the last session of each exercise, saved in the routine's notes for the next block.",
                  )}
                </p>
              </div>
              <Switch
                checked={saveLoads}
                onCheckedChange={setSaveLoads}
                aria-label={t("Save reference loads")}
              />
            </div>
            <ul className={cn("mt-3 space-y-1", !saveLoads && "opacity-50")}>
              {templateExercises.map((id) => {
                const load = loads.get(id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate">{nameOf(id)}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {load ? `${formatKg(load.pesoKg)} × ${load.reps}` : t("no data yet")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {step === 2 && isCurrent ? (
          <section className="mt-4 space-y-3">
            <div>
              <p className="font-display text-base font-semibold">{t("Next block")}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {t(
                  "{name} becomes a template with its sessions. A new current folder starts now.",
                  { name: folder.nome },
                )}
              </p>
            </div>
            <Input
              value={nextName}
              onChange={(e) => setNextName(e.target.value)}
              aria-label={t("Folder name")}
              className="h-11"
            />
            <div role="radiogroup" aria-label={t("Start with")} className="space-y-1.5">
              {[
                {
                  value: true,
                  label: t("From this template"),
                  hint: t("The standard routines come along, with the changes above."),
                },
                {
                  value: false,
                  label: t("Start empty"),
                  hint: t("Build new routines or use a template."),
                },
              ].map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  role="radio"
                  aria-checked={fromTemplate === o.value}
                  onClick={() => setFromTemplate(o.value)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                    fromTemplate === o.value
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-surface-2",
                  )}
                >
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
            {fromTemplate && hasVariations ? (
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  checked={withVariations}
                  onCheckedChange={(v) => setWithVariations(v === true)}
                />
                {t("Bring the variations too")}
              </label>
            ) : null}
          </section>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2 pb-4">
          <Button
            variant="ghost"
            className="h-11"
            disabled={busy}
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 0 ? t("Cancel") : t("Back")}
          </Button>
          {last ? (
            <Button
              className="h-11 font-semibold"
              disabled={busy || (isCurrent && !nextName.trim())}
              onClick={() => void confirm()}
            >
              {busy ? t("Saving…") : isCurrent ? t("Close cycle") : t("Save as template")}
            </Button>
          ) : (
            <Button className="h-11 font-semibold" onClick={() => setStep(step + 1)}>
              {t("Next")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
