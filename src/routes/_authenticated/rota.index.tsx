import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/route-meta";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RoutePath } from "@/components/RoutePath";
import { CheckpointSheet } from "@/components/CheckpointSheet";
import { CheckpointEditSheet } from "@/components/CheckpointEditSheet";
import { ProgressPhotoSheet } from "@/components/ProgressPhotoSheet";
import { ProgressPhotoGallery } from "@/components/ProgressPhotoGallery";
import { GoalSection } from "@/components/GoalSection";
import {
  addProgressPhoto,
  getCheckpoints,
  getProgressPhotos,
  photosInWindow,
  removeCheckpoint,
  saveCheckpoint,
} from "@/lib/data/route";
import { getProfile } from "@/lib/data/profile";
import { getWorkoutLog } from "@/lib/data/workouts";
import { getBodyWeightLog } from "@/lib/data/body-weight";
import { getCrossTraining, logCoachingEvent } from "@/lib/data/coaching";
import { mapRoute } from "@/lib/route/auto-map";
import { isoDay, addDays } from "@/lib/route/cadence";
import { currentCheckpoint, evaluateCheckpoints, nearestCheckpoint } from "@/lib/route/status";
import type { Checkpoint } from "@/lib/route/types";

import { formatDate } from "@/lib/format";
import { useLanguage, useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/rota/")({
  head: () => ({
    meta: pageMeta({
      title: "My route",
      description:
        "The path from where you started to your goal, with checkpoints your coach adjusts to your real life.",
      ogDescription: "Checkpoints, progress photos and the road to your goal.",
    }),
  }),
  component: RoutePage,
});

function RoutePage() {
  const t = useT();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Checkpoint | null>(null);
  const [editing, setEditing] = useState<Checkpoint | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const checkpointsQ = useQuery({ queryKey: ["route-checkpoints"], queryFn: getCheckpoints });
  const photosQ = useQuery({ queryKey: ["route-photos"], queryFn: getProgressPhotos });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const checkpoints = checkpointsQ.data ?? [];
  const photos = photosQ.data ?? [];
  const profile = profileQ.data;
  const goalDate = profile?.metaPrazo ?? null;
  const current = useMemo(() => currentCheckpoint(checkpoints), [checkpoints]);

  /** Re-reads the route against the logs, so status is never stale. */
  useEffect(() => {
    if (!checkpoints.length) return;
    let cancelled = false;
    void (async () => {
      const [log, cross, weights] = await Promise.all([
        getWorkoutLog(),
        getCrossTraining(),
        getBodyWeightLog(),
      ]);
      const changes = evaluateCheckpoints({
        checkpoints,
        workouts: log.workouts,
        sets: log.sets,
        cross,
        bodyWeightKg: weights[0]?.pesoKg ?? null,
        hadDrop: false,
      });
      if (cancelled || !changes.length) return;
      for (const change of changes) {
        await saveCheckpoint(change.next);
        if (change.next.status === "achieved") {
          await logCoachingEvent({
            kind: "checkpoint_reached",
            message: t("Checkpoint reached: {title}.", { title: change.next.title }),
            cause: "pattern",
          });
        }
        if (change.next.status === "adjusted") {
          await logCoachingEvent({
            kind: "checkpoint_adjusted",
            message: t("I moved '{title}' two weeks later — your week was fuller than planned.", {
              title: change.next.title,
            }),
            cause: "cross_training",
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["route-checkpoints"] });
      await queryClient.invalidateQueries({ queryKey: ["coaching-events"] });
    })();
    return () => {
      cancelled = true;
    };
    // Runs when the route or the logs change identity.
  }, [checkpoints, queryClient, t]);

  const generate = useMutation({
    mutationFn: async () => {
      if (!goalDate) throw new Error("no-goal");
      await mapRoute(goalDate, lang);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["route-checkpoints"] });
      toast.success(t("Your route is mapped."));
    },
    onError: () =>
      toast.error(t("Could not map your route right now. You can still add checkpoints yourself.")),
  });

  // The app maps the route itself: with a goal date and no checkpoints yet,
  // nobody has to press anything.
  const autoMapped = useRef(false);
  useEffect(() => {
    if (autoMapped.current || !checkpointsQ.isSuccess || !profileQ.isSuccess) return;
    if (!goalDate || checkpoints.length) return;
    autoMapped.current = true;
    generate.mutate();
    // Only the first time this screen sees an unmapped goal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointsQ.isSuccess, profileQ.isSuccess, goalDate, checkpoints.length]);

  const savePhoto = useMutation({
    mutationFn: async (input: { dataUrl: string; visibleToAi: boolean }) => {
      const today = isoDay(new Date());
      await addProgressPhoto({
        dataUrl: input.dataUrl,
        visibleToAi: input.visibleToAi,
        checkpointId: nearestCheckpoint(checkpoints, today)?.id ?? null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["route-photos"] });
      toast.success(t("Photo saved."));
    },
    onError: () => toast.error(t("Could not save that photo.")),
  });

  const saveOne = useMutation({
    mutationFn: (input: Parameters<typeof saveCheckpoint>[0]) => saveCheckpoint(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["route-checkpoints"] });
      setSelected(null);
    },
    onError: () => toast.error(t("Could not save that checkpoint.")),
  });

  const photoDue = photos.length === 0 || photosInWindow(photos).length === 0;

  if (checkpointsQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      {!checkpoints.length ? (
        <div className="rounded-lg border border-dashed border-border p-5 text-center">
          <p className="font-display text-base font-semibold">{t("Your route starts here")}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {goalDate
              ? t(
                  "I'll set checkpoints between today and your goal, based on your training, your equipment and how your weeks actually run.",
                )
              : t("First: when do you want to be there? Then I can map the way.")}
          </p>
          {goalDate ? null : goalOpen ? (
            <div className="mt-3 text-left">
              <GoalSection onSaved={() => setGoalOpen(false)} />
            </div>
          ) : (
            <Button className="tap-target mt-3" onClick={() => setGoalOpen(true)}>
              <Target className="size-4" /> {t("Set my goal date")}
            </Button>
          )}
          {goalDate ? (
            <Button
              className="tap-target mt-3"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              <Sparkles className="size-4" />
              {generate.isPending ? t("Mapping your route...") : t("Map my route")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="tap-target mt-2 w-full"
            onClick={() => {
              setEditing(null);
              setEditOpen(true);
            }}
          >
            <Plus className="size-4" /> {t("Add a checkpoint myself")}
          </Button>
        </div>
      ) : (
        <>
          {current ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
              <p className="label-caps">{t("Working towards")}</p>
              <p className="font-display mt-0.5 text-base font-semibold leading-tight">
                {current.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {formatDate(current.targetDate)}
              </p>
              {current.description ? (
                <p className="mt-2 text-xs leading-snug text-muted-foreground">
                  {current.description}
                </p>
              ) : null}
            </div>
          ) : null}

          {photoDue ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="tap-target mt-3 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left"
            >
              <Camera className="size-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{t("Time for a photo")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("Every two weeks, same spot")}
                </span>
              </span>
            </button>
          ) : null}

          <div className="mt-4">
            <RoutePath
              checkpoints={checkpoints}
              currentId={current?.id ?? null}
              startLabel={t("Start")}
              goalLabel={goalDate ? formatDate(goalDate) : t("Goal")}
              onSelect={setSelected}
            />
          </div>

          <ProgressPhotoGallery photos={photos} />

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="tap-target flex-1"
              onClick={() => {
                setEditing(null);
                setEditOpen(true);
              }}
            >
              <Plus className="size-4" /> {t("Checkpoint")}
            </Button>
            <Button
              variant="outline"
              className="tap-target flex-1"
              onClick={() => setPhotoOpen(true)}
            >
              <Camera className="size-4" /> {t("Photo")}
            </Button>
          </div>

          {goalDate ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="tap-target mt-2 w-full text-xs">
                  <Sparkles className="size-4" /> {t("Re-map my route")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Re-map my route?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "I'll replace the checkpoints I suggested with a fresh set. The ones you made or edited yourself stay.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="tap-target">{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction className="tap-target" onClick={() => generate.mutate()}>
                    {t("Re-map")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </>
      )}

      <CheckpointSheet
        checkpoint={selected}
        photos={photos.filter((p) => p.checkpointId === selected?.id)}
        onOpenChange={(open) => !open && setSelected(null)}
        onEdit={() => {
          setEditing(selected);
          setSelected(null);
          setEditOpen(true);
        }}
        onDelete={() => {
          if (!selected) return;
          void removeCheckpoint(selected.id).then(() =>
            queryClient.invalidateQueries({ queryKey: ["route-checkpoints"] }),
          );
          setSelected(null);
        }}
        onMarkReached={() => {
          if (!selected) return;
          saveOne.mutate({ ...selected, status: "achieved", achievedAt: isoDay(new Date()) });
        }}
        onAddPhoto={() => {
          setSelected(null);
          setPhotoOpen(true);
        }}
      />

      <CheckpointEditSheet
        open={editOpen}
        checkpoint={editing}
        defaultDate={isoDay(addDays(new Date(), 28))}
        onOpenChange={setEditOpen}
        onSave={(input) => saveOne.mutate(input)}
      />

      <ProgressPhotoSheet
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        onSave={(input) => savePhoto.mutateAsync(input)}
      />
    </>
  );
}
