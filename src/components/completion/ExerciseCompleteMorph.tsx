import { motion } from "framer-motion";
import { LOGO_VIEWBOX } from "./logo-paths";
import { CHECK_RIBBON_PATH } from "./route-path";

export const MORPH_DURATION = 0.5;

export interface MorphTarget {
  left: number;
  top: number;
  size: number;
}

/**
 * Phase 1: the exercise card shrinks in place into a circled checkmark, live —
 * same element, position/size/radius tweened from the card's own on-screen
 * rect to the target circle so it reads as one continuous shrink.
 */
export function ExerciseCompleteMorph({
  originRect,
  target,
  name,
  detail,
  onDone,
}: {
  originRect: DOMRect;
  target: MorphTarget;
  name: string;
  detail: string;
  onDone: () => void;
}) {
  return (
    <motion.div
      className="pointer-events-none fixed overflow-hidden border border-border bg-card shadow-lg"
      initial={{
        left: originRect.left,
        top: originRect.top,
        width: originRect.width,
        height: originRect.height,
        borderRadius: 16,
      }}
      animate={{
        left: target.left,
        top: target.top,
        width: target.size,
        height: target.size,
        borderRadius: target.size / 2,
      }}
      transition={{ duration: MORPH_DURATION, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onDone}
    >
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: MORPH_DURATION * 0.55, delay: MORPH_DURATION * 0.15 }}
      >
        <span className="truncate text-sm font-semibold">{name}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </motion.div>
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: MORPH_DURATION * 0.45, delay: MORPH_DURATION * 0.5 }}
      >
        <motion.svg
          viewBox={LOGO_VIEWBOX}
          className="size-[55%] text-primary-foreground"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: MORPH_DURATION * 0.35, delay: MORPH_DURATION * 0.55 }}
        >
          <path d={CHECK_RIBBON_PATH} fill="currentColor" />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}
