import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Info, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseHistoryCard } from "@/components/ExerciseHistoryCard";
import { CoachChatPanel } from "@/components/CoachChatSheet";
import { getExerciseTips } from "@/lib/coach/exercise-tips";
import { exerciseLoopUrl, exerciseThumbUrl } from "@/lib/exerciseMedia";
import { useT } from "@/lib/i18n";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Everything about one movement in a bottom sheet: execution loop, written
 * steps, coach cues grounded in the user's own sets, history and a scoped chat.
 */
export function ExerciseDetailSheet({
  exerciseId,
  nome,
  open,
  onOpenChange,
}: {
  exerciseId: string;
  nome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [reduced, setReduced] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    if (open) {
      setReduced(prefersReducedMotion());
      setMediaFailed(false);
    }
  }, [open]);

  const tipsQ = useQuery({
    queryKey: ["exerciseTips", exerciseId],
    queryFn: () => getExerciseTips(exerciseId),
    enabled: open,
  });

  const exercise = tipsQ.data?.exercise ?? null;
  const loop = exercise ? exerciseLoopUrl(exercise) : null;
  const thumb = exercise ? exerciseThumbUrl(exercise) : null;
  const src = reduced ? (thumb ?? loop) : loop;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-1">
          <SheetTitle className="text-xl">{nome}</SheetTitle>
        </SheetHeader>

        {tipsQ.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <div className="space-y-5 pb-4">
            {src && !mediaFailed ? (
              <div className="aspect-[3/2] w-full overflow-hidden rounded-2xl bg-surface-3">
                <img
                  src={src}
                  alt={t("How to perform {name}", { name: nome })}
                  loading="lazy"
                  decoding="async"
                  onError={() => setMediaFailed(true)}
                  className="size-full object-contain"
                />
              </div>
            ) : null}

            {exercise ? (
              <div className="flex flex-wrap gap-1.5">
                <Chip text={exercise.grupoPrimario} />
                <Chip text={exercise.equipamento} />
                {tipsQ.data?.lastLabel ? (
                  <Chip text={t("Last: {value}", { value: tipsQ.data.lastLabel })} />
                ) : null}
                {tipsQ.data?.bestLabel ? (
                  <Chip text={t("Best: {value}", { value: tipsQ.data.bestLabel })} />
                ) : null}
              </div>
            ) : null}

            {exercise?.instrucoes ? (
              <section>
                <h3 className="label-caps mb-1.5">{t("How to do it")}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {exercise.instrucoes}
                </p>
              </section>
            ) : null}

            {tipsQ.data?.tips.length ? (
              <section>
                <h3 className="label-caps mb-1.5 flex items-center gap-1.5">
                  <Info className="size-3.5" /> {t("Coach tips")}
                </h3>
                <ul className="space-y-1.5">
                  {tipsQ.data.tips.map((tip) => (
                    <li
                      key={tip}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs leading-snug"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="label-caps mb-1.5">{t("Your history")}</h3>
              <ExerciseHistoryCard exerciseId={exerciseId} />
            </section>

            <section>
              <h3 className="label-caps mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="size-3.5" /> {t("Ask about this exercise")}
              </h3>
              <CoachChatPanel
                exercise={{
                  exerciseName: nome,
                  tips: tipsQ.data?.tips ?? [],
                  lastLabel: tipsQ.data?.lastLabel ?? null,
                  bestLabel: tipsQ.data?.bestLabel ?? null,
                  stalled: tipsQ.data?.stalled ?? false,
                }}
                suggestions={[
                  t("Am I doing this right?"),
                  t("Why does it hurt here?"),
                  t("How do I progress?"),
                ]}
              />
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {t(
                  "For open-ended coaching, ask Claude — connect it in Profile → AI assistant and it reads this exercise's real history.",
                )}
              </p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
      {text}
    </span>
  );
}

/** Tips + scoped chat only, for surfaces that already show media and history. */
export function ExerciseCoachSection({
  exerciseId,
  nome,
}: {
  exerciseId: string;
  nome: string;
}) {
  const t = useT();
  const tipsQ = useQuery({
    queryKey: ["exerciseTips", exerciseId],
    queryFn: () => getExerciseTips(exerciseId),
  });

  return (
    <div className="space-y-4">
      {tipsQ.data?.tips.length ? (
        <section>
          <h3 className="label-caps mb-1.5 flex items-center gap-1.5">
            <Info className="size-3.5" /> {t("Coach tips")}
          </h3>
          <ul className="space-y-1.5">
            {tipsQ.data.tips.map((tip) => (
              <li
                key={tip}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs leading-snug"
              >
                {tip}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="label-caps mb-1.5 flex items-center gap-1.5">
          <MessageSquare className="size-3.5" /> {t("Ask about this exercise")}
        </h3>
        <CoachChatPanel
          exercise={{
            exerciseName: nome,
            tips: tipsQ.data?.tips ?? [],
            lastLabel: tipsQ.data?.lastLabel ?? null,
            bestLabel: tipsQ.data?.bestLabel ?? null,
            stalled: tipsQ.data?.stalled ?? false,
          }}
          suggestions={[
            t("Am I doing this right?"),
            t("Why does it hurt here?"),
            t("How do I progress?"),
          ]}
        />
      </section>
    </div>
  );
}
