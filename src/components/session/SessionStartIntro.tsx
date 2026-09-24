import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

import { RouteMarkDraw } from "@/components/RouteLogo";
import { useT } from "@/lib/i18n";
import type { SessionIntroOrigin } from "@/lib/session-intro";

type Phase = "open" | "mark" | "exit";

/** Purple wave → dark page → the mark drawing itself → hand-off to the workout. */
const MARK_AT_MS = 260;
const EXIT_AT_MS = 1650;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The brand opening between "Start" and the first exercise: a purple wave
 * grows out of the button that was pressed, the dark page follows it, and the
 * Route mark draws its two lines (purple, then white) over the routine name.
 * Then it dissolves into the real session screen, which is already rendered
 * underneath. A tap skips it; reduced motion never plays it.
 */
export function SessionStartIntro({
  origin,
  title,
  onDone,
}: {
  origin: SessionIntroOrigin | undefined;
  title: string;
  onDone: () => void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("open");

  const reduced = useMemo(
    () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    [],
  );

  const { x, y, radius } = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ox = origin?.x ?? w / 2;
    const oy = origin?.y ?? h / 2;
    // Far enough to reach the farthest corner from the tap.
    const r = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) + 8;
    return { x: ox, y: oy, radius: r };
  }, [origin]);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const mark = window.setTimeout(() => setPhase((p) => (p === "open" ? "mark" : p)), MARK_AT_MS);
    const exit = window.setTimeout(() => setPhase("exit"), EXIT_AT_MS);
    return () => {
      window.clearTimeout(mark);
      window.clearTimeout(exit);
    };
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) return null;

  const from = `circle(0px at ${x}px ${y}px)`;
  const to = `circle(${radius}px at ${x}px ${y}px)`;
  const exiting = phase === "exit";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] cursor-pointer"
      role="presentation"
      onClick={() => setPhase("exit")}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.38 : 0, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (exiting) onDone();
      }}
    >
      {/* The wave: purple leads, the page follows a beat behind — the mark's two lines. */}
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

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-8 text-center"
        animate={exiting ? { scale: 0.92, y: -24 } : { scale: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeIn" }}
      >
        <div className="grid size-32 place-items-center">
          {phase !== "open" ? <RouteMarkDraw className="size-32" /> : null}
        </div>

        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={phase === "open" ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35, ease: EASE_OUT }}
        >
          <p className="label-caps text-primary">{t("One more step on your route")}</p>
          <p className="font-display text-2xl font-semibold leading-tight text-foreground">
            {title}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
