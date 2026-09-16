import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ExerciseCompleteMorph, type MorphTarget } from "./ExerciseCompleteMorph";
import { LogoRouteReveal } from "./LogoRouteReveal";
import { ExerciseCard, type CardRect } from "./ExerciseCard";

type Phase = "morph" | "reveal" | "card" | "exit";

const MORPH_SIZE = 96;

/**
 * Plays when an exercise is finished mid-workout and another one is waiting:
 * card → checkmark → route → logo → card flip → next exercise, then hands
 * back to the real session screen. Portalled to <body> so it sits above
 * everything (bottom nav included) regardless of where it's mounted from.
 * A tap anywhere ends the sequence immediately.
 */
export function ExerciseCompleteSequence({
  originRect,
  completedName,
  completedDetail,
  nextExerciseId,
  nextExerciseName,
  onFinish,
}: {
  originRect: DOMRect;
  completedName: string;
  completedDetail: string;
  nextExerciseId: string;
  nextExerciseName: string;
  onFinish: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("morph");

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
          onDone={() => setPhase("reveal")}
        />
      ) : null}

      {phase === "reveal" ? (
        <LogoRouteReveal
          target={morphTarget}
          finalSize={finalLogoSize}
          onDone={() => setPhase("card")}
        />
      ) : null}

      {phase === "card" || phase === "exit" ? (
        <motion.div animate={{ opacity: phase === "exit" ? 0 : 1 }} transition={{ duration: 0.2 }}>
          <ExerciseCard
            target={logoFinalRect}
            cardRect={cardRect}
            exerciseId={nextExerciseId}
            exerciseName={nextExerciseName}
            onDismiss={finish}
          />
        </motion.div>
      ) : null}
    </div>,
    document.body,
  );
}
