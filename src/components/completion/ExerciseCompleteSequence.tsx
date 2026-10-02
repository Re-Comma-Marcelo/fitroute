import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ExerciseCompleteMorph, type MorphTarget } from "./ExerciseCompleteMorph";
import { LogoRouteReveal, type RevealPace } from "./LogoRouteReveal";
import { LOGO_PATH_INNER, LOGO_PATH_OUTER, LOGO_VIEWBOX } from "./logo-paths";
import { RouteMarkProgress } from "@/components/RouteLogo";
import { ExerciseCard, type CardRect } from "./ExerciseCard";
import type { ExercisePreview } from "@/lib/exercise-preview";

type Phase = "morph" | "reveal" | "progress" | "card" | "exit";

const MORPH_SIZE = 96;
/** Quicker than the session start: this plays after every exercise. */
const MORPH_SECONDS = 0.35;
const REVEAL_PACE: RevealPace = { holdMs: 40, route: 0.32, logo: 0.32 };
/** The R traces to today's progress, then the card takes over as the stroke settles. */
const PROGRESS_MS = 520;
/** LOGO_VIEWBOX_MARK is "-87 -20 1440 1440": the mark's box around the 1254-unit logo. */
const MARK_BOX = { x: -87, y: -20, size: 1440, logo: 1254 };

/**
 * Plays when an exercise is finished mid-workout and another one is waiting:
 * card → checkmark → the two lines wander their route → they land on the
 * Route mark, which fades to a trace while the R draws itself up to how far
 * the session has got (whole once every exercise is done) → card flip → next
 * exercise. Quicker than the session start, since it plays after every
 * exercise (~1.5 s to the card). Portalled to <body> so it sits above
 * everything (bottom nav included). A tap anywhere ends the sequence.
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
  const reduced = useMemo(
    () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    [],
  );
  // With reduced motion the next exercise's card shows at once.
  const [phase, setPhase] = useState<Phase>(reduced ? "card" : "morph");

  const morphTarget = useMemo<MorphTarget>(
    () => ({
      size: MORPH_SIZE,
      left: window.innerWidth / 2 - MORPH_SIZE / 2,
      top: window.innerHeight / 2 - MORPH_SIZE / 2,
    }),
    [],
  );

  const finalLogoSize = useMemo(() => Math.min(window.innerWidth * 0.55, 260), []);

  const logoFinalRect = useMemo<MorphTarget>(
    () => ({
      size: finalLogoSize,
      left: window.innerWidth / 2 - finalLogoSize / 2,
      top: window.innerHeight / 2 - finalLogoSize / 2,
    }),
    [finalLogoSize],
  );

  const cardRect = useMemo<CardRect>(() => {
    const width = Math.min(window.innerWidth * 0.88, 380);
    const height = Math.min(window.innerHeight * 0.62, 460);
    return {
      width,
      height,
      left: (window.innerWidth - width) / 2,
      top: (window.innerHeight - height) / 2,
    };
  }, []);

  // Mount the R at the old progress, then let it trace to the new one.
  const [progress, setProgress] = useState(progressFrom * 100);
  useEffect(() => {
    if (phase !== "progress") return;
    const raf = window.requestAnimationFrame(() => setProgress(progressTo * 100));
    const next = window.setTimeout(
      () => setPhase((p) => (p === "progress" ? "card" : p)),
      PROGRESS_MS,
    );
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(next);
    };
  }, [phase, progressTo]);

  // The progress mark's own viewBox, laid exactly over the landed logo.
  const unit = finalLogoSize / MARK_BOX.logo;
  const markRect = {
    left: logoFinalRect.left + MARK_BOX.x * unit,
    top: logoFinalRect.top + MARK_BOX.y * unit,
    size: MARK_BOX.size * unit,
  };

  function finish() {
    setPhase("exit");
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "exit" ? 0 : 0.72 }}
        transition={{ duration: phase === "exit" ? 0.2 : 0.5 }}
        onAnimationComplete={() => {
          if (phase === "exit") onFinish();
        }}
        onClick={finish}
      />

      {phase === "morph" ? (
        <ExerciseCompleteMorph
          originRect={originRect}
          target={morphTarget}
          name={completedName}
          detail={completedDetail}
          duration={MORPH_SECONDS}
          onDone={() => setPhase("reveal")}
        />
      ) : null}

      {phase === "reveal" ? (
        <LogoRouteReveal
          target={morphTarget}
          finalSize={finalLogoSize}
          pace={REVEAL_PACE}
          onDone={() => setPhase("progress")}
        />
      ) : null}

      {phase === "progress" ? (
        <div className="pointer-events-none">
          {/* The landed mark fades to a trace of the whole route… */}
          <motion.svg
            viewBox={LOGO_VIEWBOX}
            className="fixed text-primary-foreground"
            style={{
              left: logoFinalRect.left,
              top: logoFinalRect.top,
              width: logoFinalRect.size,
              height: logoFinalRect.size,
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0.12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <path d={LOGO_PATH_OUTER} fill="currentColor" />
            <path d={LOGO_PATH_INNER} fill="currentColor" />
          </motion.svg>
          {/* …and the R draws itself over it, as far as the session has got. */}
          <div
            className="fixed"
            style={{
              left: markRect.left,
              top: markRect.top,
              width: markRect.size,
              height: markRect.size,
            }}
          >
            <RouteMarkProgress progress={progress} className="size-full" />
          </div>
        </div>
      ) : null}

      {phase === "card" || phase === "exit" ? (
        <motion.div animate={{ opacity: phase === "exit" ? 0 : 1 }} transition={{ duration: 0.2 }}>
          <ExerciseCard
            target={logoFinalRect}
            cardRect={cardRect}
            exerciseId={nextExerciseId}
            exerciseName={nextExerciseName}
            preview={nextPreview}
            onDismiss={finish}
          />
        </motion.div>
      ) : null}
    </div>,
    document.body,
  );
}
