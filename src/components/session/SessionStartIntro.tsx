import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

import { RouteMark, RouteMarkDraw } from "@/components/RouteLogo";
import { ExerciseCard, type CardRect } from "@/components/completion/ExerciseCard";
import type { MorphTarget } from "@/components/completion/ExerciseCompleteMorph";
import { SessionBriefing, type BriefingChoices } from "@/components/session/SessionBriefing";
import { exercisePreview } from "@/lib/exercise-preview";
import { useT } from "@/lib/i18n";
import type { ActiveSession } from "@/lib/session-state";
import type { SessionIntroOrigin } from "@/lib/session-intro";
import { cn } from "@/lib/utils";

type Phase = "open" | "mark" | "brief" | "card" | "exit";

/** Purple wave → dark page → the mark drawing itself → the briefing. */
const MARK_AT_MS = 260;
const BRIEF_AT_MS = 1650;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CARD_SEED = 96;

/**
 * The opening between "Start" and the first set: a purple wave grows out of
 * the button that was pressed, the dark page follows it, and the Route mark
 * draws its two lines over the routine name. The mark then moves up and the
 * briefing takes the screen (today's plan, how you feel, warm-up, "Let's go");
 * "Let's go" flips in the card of the first exercise, and a tap on it hands
 * over to the session screen, already rendered underneath.
 *
 * A tap during the wave skips straight to the briefing. With reduced motion
 * the briefing shows at once and "Let's go" goes straight to the session.
 */
export function SessionStartIntro({
  origin,
  title,
  session,
  onDeload,
  onBegin,
  onDone,
}: {
  origin: SessionIntroOrigin | undefined;
  title: string;
  session: ActiveSession;
  onDeload: (on: boolean) => Promise<boolean>;
  onBegin: (choices: BriefingChoices) => void;
  onDone: () => void;
}) {
  const t = useT();

  const reduced = useMemo(
    () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    [],
  );
  const [phase, setPhase] = useState<Phase>(reduced ? "brief" : "open");

  const { x, y, radius } = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ox = origin?.x ?? w / 2;
    const oy = origin?.y ?? h / 2;
    // Far enough to reach the farthest corner from the tap.
    const r = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) + 8;
    return { x: ox, y: oy, radius: r };
  }, [origin]);

  const { seed, cardRect } = useMemo<{ seed: MorphTarget; cardRect: CardRect }>(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const width = Math.min(w * 0.88, 380);
    const height = Math.min(h * 0.62, 460);
    return {
      seed: { size: CARD_SEED, left: w / 2 - CARD_SEED / 2, top: h / 2 - CARD_SEED / 2 },
      cardRect: { width, height, left: (w - width) / 2, top: (h - height) / 2 },
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const mark = window.setTimeout(() => setPhase((p) => (p === "open" ? "mark" : p)), MARK_AT_MS);
    const brief = window.setTimeout(
      () => setPhase((p) => (p === "open" || p === "mark" ? "brief" : p)),
      BRIEF_AT_MS,
    );
    return () => {
      window.clearTimeout(mark);
      window.clearTimeout(brief);
    };
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = session.exercicios[session.atual] ?? session.exercicios[0];
  const firstPreview = useMemo(() => (first ? exercisePreview(first) : undefined), [first]);

  function begin(choices: BriefingChoices) {
    onBegin(choices);
    if (reduced) {
      onDone();
      return;
    }
    setPhase(first ? "card" : "exit");
  }

  const from = `circle(0px at ${x}px ${y}px)`;
  const to = `circle(${radius}px at ${x}px ${y}px)`;
  const opening = phase === "open" || phase === "mark";
  const exiting = phase === "exit";

  return createPortal(
    <motion.div
      className={cn("fixed inset-0 z-[100]", opening && "cursor-pointer")}
      // A dialog once interactive: the session screen ignores swipes from dialogs,
      // and React bubbles this portal's touches up to it.
      role={opening ? "presentation" : "dialog"}
      aria-modal={opening ? undefined : true}
      aria-label={opening ? undefined : title}
      onClick={() => {
        if (opening) setPhase("brief");
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.38 : 0, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (exiting) onDone();
      }}
    >
      {/* The wave: purple leads, the page follows a beat behind — the mark's two lines. */}
      {reduced ? (
        <div className="absolute inset-0 bg-background" />
      ) : (
        <>
          <motion.div
            className="absolute inset-0 bg-primary"
            initial={{ clipPath: from }}
            animate={{ clipPath: to }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
          <motion.div
            className="absolute inset-0 bg-background"
            initial={{ clipPath: from }}
            animate={{ clipPath: to }}
            transition={{ duration: 0.55, delay: 0.09, ease: EASE_OUT }}
          />
        </>
      )}

      <motion.div
        className={cn(
          "absolute inset-0 mx-auto flex max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),1.5rem)]",
          (phase === "card" || exiting) && "pointer-events-none",
        )}
        animate={
          phase === "card" || exiting ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.3, ease: "easeIn" }}
      >
        <motion.div
          layout={!reduced}
          className={cn(
            "flex shrink-0 flex-col items-center text-center",
            opening ? "flex-1 justify-center gap-7" : "gap-2",
          )}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <motion.div
            layout={!reduced}
            className={cn("grid place-items-center", opening ? "size-32" : "size-12")}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            {reduced ? (
              <RouteMark className="size-full" />
            ) : phase !== "open" ? (
              <RouteMarkDraw className="size-full" />
            ) : null}
          </motion.div>

          <motion.div
            layout={reduced ? false : "position"}
            className="space-y-1"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={phase === "open" ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: opening ? 0.35 : 0, ease: EASE_OUT }}
          >
            <p className="label-caps text-primary">{t("One more step on your route")}</p>
            <p
              className={cn(
                "font-display font-semibold leading-tight text-foreground",
                opening ? "text-2xl" : "text-xl",
              )}
            >
              {title}
            </p>
          </motion.div>
        </motion.div>

        {!opening ? (
          <SessionBriefing session={session} onDeload={onDeload} onBegin={begin} />
        ) : null}
      </motion.div>

      {(phase === "card" || exiting) && first ? (
        <>
          <div className="absolute inset-0" role="presentation" onClick={() => setPhase("exit")} />
          <ExerciseCard
            target={seed}
            cardRect={cardRect}
            exerciseId={first.exerciseId}
            exerciseName={first.nome}
            label={t("First exercise")}
            preview={firstPreview}
            onDismiss={() => setPhase("exit")}
          />
        </>
      ) : null}
    </motion.div>,
    document.body,
  );
}
