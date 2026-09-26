import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Pencil, Repeat2 } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderVariations } from "@/components/folders/FolderVariations";
import { useFolderActions } from "@/components/folders/use-folder-actions";
import { WorkoutHistoryItem } from "@/components/progress/WorkoutHistoryItem";
import { getExercises } from "@/lib/data/exercises";
import {
  getFolders,
  isStandard,
  makeFolderCurrent,
  renameFolder,
  routinesInFolder,
  swapStats,
  variationSessionsOf,
  workoutsInFolder,
} from "@/lib/data/folders";
import { getRoutines } from "@/lib/data/routines";
import { getWorkoutLog, getWorkouts } from "@/lib/data/workouts";
import { formatDate, formatKg, relativeDays } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { loadActiveSession } from "@/lib/session-state";
import { startRoutineSession } from "@/lib/start-session";
import { swapReasonLabel } from "@/lib/swap-reasons";

/**
 * One folder at a glance: how the block went (standard vs variation),
 * its standard routines, its variations, what got swapped most and why, and
 * every session done in it.
 */
export function FolderDetailSheet({
  folderId,
  onOpenChange,
  onStartRoutine,
  startDisabled = false,
}: {
  folderId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Start a routine (optionally with swaps); defaults to starting it here. */
  onStartRoutine?: (routineId: string, swaps?: Record<string, string>) => void;
  startDisabled?: boolean;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { refreshFolderViews, promoteRoutine, promoteSession } = useFolderActions();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);

  const open = folderId !== null;
  const foldersQuery = useQuery({ queryKey: ["folders"], queryFn: getFolders, enabled: open });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines, enabled: open });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts, enabled: open });
  const logQuery = useQuery({ queryKey: ["workout-log"], queryFn: getWorkoutLog, enabled: open });
  const exercisesQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
    enabled: open,
  });

  const folders = foldersQuery.data ?? [];
  const folder = folders.find((f) => f.id === folderId) ?? null;
  const currentId = folders.find((f) => f.status === "atual")?.id ?? null;
  const allRoutines = routinesQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];
  const sets = logQuery.data?.sets ?? [];

  const view = useMemo(() => {
    if (!folder) return null;
    const routines = routinesInFolder(allRoutines, folder.id, currentId);
    const workouts = workoutsInFolder(workoutsQuery.data ?? [], folder.id, currentId);
    const standard = routines.filter(isStandard);
    const variations = routines.filter((r) => !isStandard(r));
    const variationCount = workouts.filter((w) => w.variacao).length;
    const groupOf = (id: string) => exercises.find((e) => e.id === id)?.grupoPrimario ?? "";
    return {
      standard,
      variations,
      workouts,
      variationSessions: variationSessionsOf(workouts, allRoutines, sets),
      swaps: swapStats(workouts, sets, groupOf),
      variationCount,
      standardCount: workouts.length - variationCount,
      volume: workouts.reduce((sum, w) => sum + w.volumeTotalKg, 0),
    };
  }, [folder, allRoutines, currentId, workoutsQuery.data, exercises, sets]);

  const nameOf = (id: string) => exercises.find((e) => e.id === id)?.nome ?? t("Exercise");

  async function start(routineId: string, swaps?: Record<string, string>) {
    if (onStartRoutine) {
      onStartRoutine(routineId, swaps);
      return;
    }
    onOpenChange(false);
    if (loadActiveSession()) {
      navigate({ to: "/sessao" });
      return;
    }
    try {
      await startRoutineSession(routineId, swaps ? { swaps } : {});
      navigate({ to: "/sessao" });
    } catch {
      toast.error(t("Could not start the session. Check your connection and try again."));
    }
  }

  async function act(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      await refreshFolderViews();
      toast.success(done);
      return true;
    } catch {
      toast.error(t("Could not update your folders. Try again."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveRename() {
    const nome = draftName.trim();
    if (!folder || !nome) return;
    if (await act(() => renameFolder(folder.id, nome), t("Folder renamed."))) setRenaming(false);
  }

  const lastOf = (routineId: string) =>
    view?.workouts
      .filter((w) => w.routineId === routineId)
      .reduce<string | null>((max, w) => (!max || w.iniciadoEm > max ? w.iniciadoEm : max), null);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setRenaming(false);
        onOpenChange(o);
      }}
    >
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto">
        {!folder || !view ? (
          <div className="mt-8 space-y-3">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-card" />
            <div className="h-24 animate-pulse rounded-2xl bg-card" />
          </div>
        ) : (
          <div className="pb-6">
            <SheetHeader>
              {renaming ? (
                <div className="flex gap-2 pr-8">
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveRename();
                    }}
                    aria-label={t("Folder name")}
                    className="h-11"
                  />
                  <Button
                    size="icon"
                    className="tap-target size-11 shrink-0"
                    disabled={busy || !draftName.trim()}
                    aria-label={t("Save")}
                    onClick={() => void saveRename()}
                  >
                    <Check className="size-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pr-8">
                  <SheetTitle className="min-w-0 truncate text-xl">{folder.nome}</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target size-9 shrink-0"
                    aria-label={t("Rename {name}", { name: folder.nome })}
                    onClick={() => {
                      setDraftName(folder.nome);
                      setRenaming(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              )}
            </SheetHeader>
            <p className="mt-1 text-xs text-muted-foreground">
              {folder.status === "atual"
                ? t("Current")
                : folder.status === "modelo"
                  ? t("Template")
                  : t("Archived")}{" "}
              ·{" "}
              {folder.fimEm
                ? t("{start} – {end}", {
                    start: formatDate(folder.inicioEm),
                    end: formatDate(folder.fimEm),
                  })
                : t("since {date}", { date: formatDate(folder.inicioEm) })}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label={t("Sessions")} value={String(view.workouts.length)} />
              <Stat label={t("Standard")} value={String(view.standardCount)} />
              <Stat label={t("Variations")} value={String(view.variationCount)} muted />
            </div>
            {view.workouts.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("{pct}% of sessions followed the standard · {volume} lifted", {
                  pct: Math.round((view.standardCount / view.workouts.length) * 100),
                  volume: formatKg(view.volume),
                })}
              </p>
            ) : null}

            {folder.status !== "atual" ? (
              <Button
                variant="secondary"
                className="mt-3 h-11 w-full font-semibold"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => makeFolderCurrent(folder.id),
                    t("{name} is your current folder.", { name: folder.nome }),
                  )
                }
              >
                {t("Make current")}
              </Button>
            ) : null}

            <h3 className="label-caps mt-6 mb-2">{t("Standard routines")}</h3>
            {view.standard.length ? (
              <ul className="space-y-2">
                {view.standard.map((r) => {
                  const last = lastOf(r.id);
                  const count = view.workouts.filter((w) => w.routineId === r.id).length;
                  return (
                    <li key={r.id}>
                      <Link
                        to="/rotina/$id"
                        params={{ id: r.id }}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base font-semibold">{r.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("{count} sessions", { count })} ·{" "}
                            {last
                              ? t("last {time}", { time: relativeDays(last) })
                              : t("never trained")}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t("No standard routines here.")}</p>
            )}

            <FolderVariations
              routines={view.variations}
              sessions={view.variationSessions}
              allRoutines={allRoutines}
              exercises={exercises}
              disabled={startDisabled || busy}
              defaultOpen
              onStartRoutine={(id) => void start(id)}
              onRepeatSession={(s) => void start(s.routine.id, s.swaps)}
              onPromoteRoutine={(id) => void promoteRoutine(id)}
              onPromoteSession={(s) => void promoteSession(s)}
            />

            {view.swaps.length ? (
              <>
                <h3 className="label-caps mt-6 mb-2">{t("Most swapped")}</h3>
                <ul className="space-y-2">
                  {view.swaps.map((s) => (
                    <li
                      key={`${s.from}>${s.to}`}
                      className="rounded-xl border border-border bg-card/60 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        {s.group ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Repeat2 className="size-3" aria-hidden /> {s.group}
                          </span>
                        ) : null}
                        <span className="ml-auto text-xs font-semibold tabular-nums text-foreground">
                          {t("{count}×", { count: s.count })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">
                        {t("{to} instead of {from}", { to: nameOf(s.to), from: nameOf(s.from) })}
                      </p>
                      {s.reasons.length ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.reasons
                            .map((r) => swapReasonLabel(r))
                            .filter((l): l is string => Boolean(l))
                            .map((l) => t(l))
                            .join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <h3 className="label-caps mt-6 mb-2">{t("Sessions in this folder")}</h3>
            {view.workouts.length ? (
              <ul className="space-y-2">
                {view.workouts.map((w) => (
                  <WorkoutHistoryItem
                    key={w.id}
                    workout={w}
                    routines={allRoutines}
                    sets={sets}
                    exercises={exercises}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("No sessions in this folder yet.")}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p
        className={
          muted
            ? "font-display text-lg font-semibold tabular-nums text-muted-foreground"
            : "font-display text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}
