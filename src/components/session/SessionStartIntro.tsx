import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { RouteMark, RouteMarkDraw } from "@/components/RouteLogo";
import { ExerciseCard, type CardRect } from "@/components/completion/ExerciseCard";
import { MORPH_DURATION, type MorphTarget } from "@/components/completion/ExerciseCompleteMorph";
import { LogoRouteReveal } from "@/components/completion/LogoRouteReveal";
import { LOGO_VIEWBOX } from "@/components/completion/logo-paths";
import { CHECK_RIBBON_PATH } from "@/components/completion/route-path";
import { SessionBriefing, type BriefingChoices } from "@/components/session/SessionBriefing";
import { getExercises } from "@/lib/data/exercises";
import { exerciseLoopUrl } from "@/lib/exerciseMedia";
import { exercisePreview } from "@/lib/exercise-preview";
import { useT } from "@/lib/i18n";
import type { ActiveSession } from "@/lib/session-state";
import type { SessionIntroOrigin } from "@/lib/session-intro";
import { cn } from "@/lib/utils";

type Phase = "open" | "mark" | "brief" | "check" | "reveal" | "card" | "exit";

/** Purple wave → dark page → the mark drawing itself → the briefing. */
const MARK_AT_MS = 260;
const BRIEF_AT_MS = 1650;
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Same circle the mid-workout hand-off shrinks into. */
const MORPH_SIZE = 96;

/**
 * The opening between "Start" and the first set: a purple wave grows out of
 * the button that was pressed, the dark page follows it, and the Route mark
 * draws its two lines over the routine name. The mark then moves up and the
 * briefing takes the screen (today's plan, how you feel, warm-up, "Let's go").
 * "Let's go" then walks the same route as finishing an exercise mid-workout:
 * the button closes into a check, the check walks its route into the mark,
 * and the mark flips into the card of the first exercise — its loop included.
 * A tap on the card hands over to the session screen, already rendered
 * underneath.
 *
 * A tap during the wave skips straight to the briefing, a tap during the
 * route straight to the card. With reduced motion the briefing shows at once
 * and "Let's go" goes straight to the session.
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

  // Same geometry as the mid-workout hand-off, so both read as one gesture.
  const { checkTarget, logoRect, cardRect } = useMemo<{
    checkTarget: MorphTarget;
    logoRect: MorphTarget;
    cardRect: CardRect;
  }>(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const logo = Math.min(w * 0.55, 260);
    const width = Math.min(w * 0.88, 380);
    const height = Math.min(h * 0.62, 460);
    return {
      checkTarget: { size: MORPH_SIZE, left: w / 2 - MORPH_SIZE / 2, top: h / 2 - MORPH_SIZE / 2 },
      logoRect: { size: logo, left: w / 2 - logo / 2, top: h / 2 - logo / 2 },
      cardRect: { width, height, left: (w - width) / 2, top: (h - height) / 2 },
    };
  }, []);
  const [beginRect, setBeginRect] = useState<DOMRect | null>(null);

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

  // Load the catalog and the first loop while the briefing is read, so the
  // card flips in with its picture instead of just the name.
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const firstLoop = useMemo(() => {
    const ex = exercisesQuery.data?.find((e) => e.id === first?.exerciseId);
    return ex ? exerciseLoopUrl(ex) : null;
  }, [exercisesQuery.data, first?.exerciseId]);
  useEffect(() => {
    if (!firstLoop) return;
    const img = new Image();
    img.src = firstLoop;
  }, [firstLoop]);

  function begin(choices: BriefingChoices, from?: DOMRect) {
    onBegin(choices);
    if (reduced) {
      onDone();
      return;
    }
    if (!first) {
      setPhase("exit");
      return;
    }
    setBeginRect(
      from ?? new DOMRect(checkTarget.left, checkTarget.top, checkTarget.size, checkTarget.size),
    );
    setPhase("check");
  }

  const from = `circle(0px at ${x}px ${y}px)`;
  const to = `circle(${radius}px at ${x}px ${y}px)`;
  const opening = phase === "open" || phase === "mark";
  const exiting = phase === "exit";
  const handingOff = phase === "check" || phase === "reveal" || phase === "card" || exiting;

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
          handingOff && "pointer-events-none",
        )}
        animate={handingOff ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }}
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

      {(phase === "check" || phase === "reveal") && first ? (
        <div className="absolute inset-0" role="presentation" onClick={() => setPhase("card")} />
      ) : null}

      {phase === "check" && beginRect ? (
        <BeginCheck
          originRect={beginRect}
          target={checkTarget}
          label={t("Let's go")}
          onDone={() => setPhase((p) => (p === "check" ? "reveal" : p))}
        />
      ) : null}

      {phase === "reveal" ? (
        <LogoRouteReveal
          target={checkTarget}
          finalSize={logoRect.size}
          onDone={() => setPhase((p) => (p === "reveal" ? "card" : p))}
        />
      ) : null}

      {(phase === "card" || exiting) && first ? (
        <>
          <div className="absolute inset-0" role="presentation" onClick={() => setPhase("exit")} />
          <ExerciseCard
            target={logoRect}
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

/**
 * "Let's go" closes into the check that opens every exercise hand-off: the
 * button's own rect shrinks into the purple circle while its label fades and
 * the check pops in. Hands over to the route reveal at the same center/size.
 */
function BeginCheck({
  originRect,
  target,
  label,
  onDone,
}: {
  originRect: DOMRect;
  target: MorphTarget;
  label: string;
  onDone: () => void;
}) {
  return (
    <motion.div
      className="pointer-events-none fixed overflow-hidden bg-primary text-primary-foreground shadow-lg"
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
      transition={{ duration: MORPH_DURATION, ease: EASE_OUT }}
      onAnimationComplete={onDone}
    >
      <motion.span
        className="absolute inset-0 grid place-items-center whitespace-nowrap text-base font-semibold"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: MORPH_DURATION * 0.4 }}
      >
        {label}
      </motion.span>
      <div className="absolute inset-0 grid place-items-center">
        <motion.svg
          viewBox={LOGO_VIEWBOX}
          className="size-[55%]"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: MORPH_DURATION * 0.35, delay: MORPH_DURATION * 0.55 }}
        >
          <path d={CHECK_RIBBON_PATH} fill="currentColor" />
        </motion.svg>
      </div>
    </motion.div>
  );
}
