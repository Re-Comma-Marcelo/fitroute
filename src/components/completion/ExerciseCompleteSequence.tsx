import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { RouteMarkProgress } from "@/components/RouteLogo";
import { useT } from "@/lib/i18n";
import { ExerciseCard, type CardRect } from "./ExerciseCard";
import type { MorphTarget } from "./ExerciseCompleteMorph";
import type { ExercisePreview } from "@/lib/exercise-preview";

type Phase = "wave" | "mark" | "card" | "exit";

/** Same wave as the session start (SessionStartIntro), so both read as one gesture. */
const MARK_AT_MS = 260;
/** The R's stroke transition is 600ms; the card follows right after. */
const CARD_AT_MS = 1150;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Plays when an exercise is finished mid-workout and another one is waiting:
 * the purple wave of the session start grows out of the finished card, the
 * Route mark draws itself a little further — as far as the session has got,
 * whole once every exercise is done — and grows into the next exercise's
 * card. Portalled to <body> so it sits above everything (bottom nav
 * included). A tap skips to the card; a tap on the card ends the sequence.
 */
export function ExerciseCompleteSequence({
  originRect,
  completedName,
  completedDetail,
  nextExerciseId,
  nextExerciseName,
  progressFrom,
  progressTo,
  nextPreview,
  onFinish,
}: {
  originRect: DOMRect;
  completedName: string;
  completedDetail: string;
  nextExerciseId: string;
  nextExerciseName: string;
  /** Share of the session done before this exercise (0-1). */
  progressFrom: number;
  /** Share done now, this exercise included (0-1). */
  progressTo: number;
  /** Today's target vs last time for the next exercise, shown on its card. */
  nextPreview?: ExercisePreview | undefined;
  onFinish: () => void;
}) {
  const t = useT();
  const reduced = useMemo(
    () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    [],
  );
  const [phase, setPhase] = useState<Phase>(reduced ? "card" : "wave");
  const [progress, setProgress] = useState(progressFrom * 100);

  const { x, y, radius } = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ox = originRect.left + originRect.width / 2;
    const oy = originRect.top + originRect.height / 2;
    // Far enough to reach the farthest corner from the card.
    const r = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) + 8;
    return { x: ox, y: oy, radius: r };
  }, [originRect]);

  const { logoRect, cardRect } = useMemo<{ logoRect: MorphTarget; cardRect: CardRect }>(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const logo = Math.min(w * 0.4, 180);
    const width = Math.min(w * 0.88, 380);
    const height = Math.min(h * 0.62, 460);
    return {
      logoRect: { size: logo, left: w / 2 - logo / 2, top: h / 2 - logo / 2 },
      cardRect: { width, height, left: (w - width) / 2, top: (h - height) / 2 },
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const mark = window.setTimeout(() => setPhase((p) => (p === "wave" ? "mark" : p)), MARK_AT_MS);
    const card = window.setTimeout(
      () => setPhase((p) => (p === "wave" || p === "mark" ? "card" : p)),
      CARD_AT_MS,
    );
    return () => {
      window.clearTimeout(mark);
      window.clearTimeout(card);
    };
  }, [reduced]);

  // Mount at the old progress, then let the stroke travel to the new one.
  useEffect(() => {
    if (phase !== "mark") return;
    const id = window.requestAnimationFrame(() => setProgress(progressTo * 100));
    return () => window.cancelAnimationFrame(id);
  }, [phase, progressTo]);

  const from = `circle(0px at ${x}px ${y}px)`;
  const to = `circle(${radius}px at ${x}px ${y}px)`;
  const exiting = phase === "exit";
  const opening = phase === "wave" || phase === "mark";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100]"
      role="presentation"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.25 : 0, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (exiting) onFinish();
      }}
      onClick={() => {
        if (opening) setPhase("card");
      }}
    >
      {reduced ? (
        <div className="absolute inset-0 bg-background" />
      ) : (
        <>
          <motion.div
            className="absolute inset-0 bg-primary"
            initial={{ clipPath: from }}
            animate={{ clipPath: to }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          />
          <motion.div
            className="absolute inset-0 bg-background"
            initial={{ clipPath: from }}
            animate={{ clipPath: to }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE_OUT }}
          />
        </>
      )}

      {phase === "mark" ? (
        <motion.div
          className="absolute inset-x-0 flex flex-col items-center gap-4 text-center"
          style={{ top: logoRect.top }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <div style={{ width: logoRect.size, height: logoRect.size }}>
            <RouteMarkProgress
              progress={progress}
              className="size-full"
              label={t("Workout progress")}
            />
          </div>
          <div className="space-y-0.5 px-6">
            <p className="label-caps text-primary">{completedName}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{completedDetail}</p>
          </div>
        </motion.div>
      ) : null}

      {phase === "card" || exiting ? (
        <ExerciseCard
          target={logoRect}
          cardRect={cardRect}
          exerciseId={nextExerciseId}
          exerciseName={nextExerciseName}
          preview={nextPreview}
          onDismiss={() => setPhase("exit")}
        />
      ) : null}
    </motion.div>,
    document.body,
  );
}
