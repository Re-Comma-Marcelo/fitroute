import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getExercises } from "@/lib/data/exercises";
import { exerciseLoopUrl, exerciseThumbUrl } from "@/lib/exerciseMedia";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const KEY = "forja.executionCard.open.v1";

function readOpen(): boolean {
 if (typeof window === "undefined") return false;
 return window.localStorage.getItem(KEY) === "1";
}

function prefersReducedMotion(): boolean {
 if (typeof window === "undefined" || !window.matchMedia) return false;
 return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Execution reference for an exercise: an animated loop (static thumb when the
 * user asked for reduced motion), collapsed by default and remembered locally.
 */
export function ExerciseExecutionCard({
 exercise,
 className,
}: {
 exercise: { nome: string; midiaUrl?: string | null; thumbUrl?: string | null };
 className?: string | undefined;
}) {
 const t = useT();
 const [open, setOpen] = useState(false);
 const [reduced, setReduced] = useState(false);
 const [failed, setFailed] = useState(false);

 useEffect(() => {
 setOpen(readOpen());
 setReduced(prefersReducedMotion());
 }, []);

 const loop = exerciseLoopUrl(exercise);
 const thumb = exerciseThumbUrl(exercise);
 if (!loop) return null;

 const src = reduced ? (thumb ?? loop) : loop;

 return (
 <div className={cn("overflow-hidden rounded-lg border border-border bg-surface-2", className)}>
 <button
 type="button"
 onClick={() => {
 const next = !open;
 setOpen(next);
 try {
 window.localStorage.setItem(KEY, next ? "1" : "0");
 } catch {
 // Quota: the preference is disposable.
 }
 }}
 aria-expanded={open}
 className="tap-target flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold"
 >
 {open ? t("Hide execution") : t("See execution")}
 {open ? (
 <ChevronUp className="size-4 text-muted-foreground" />
 ) : (
 <ChevronDown className="size-4 text-muted-foreground" />
 )}
 </button>

 {open ? (
 <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-surface-3">
 {failed ? (
 <p className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
 {t("No image for this exercise")}
 </p>
 ) : (
 <img
 src={src}
 alt={t("How to perform {name}", { name: exercise.nome })}
 loading="lazy"
 decoding="async"
 onError={() => setFailed(true)}
 className="size-full object-contain"
 />
 )}
 </div>
 ) : null}
 </div>
 );
}

/** Same card, resolved from the catalog by id (used inside a live session). */
export function ExerciseExecutionCardById({
 exerciseId,
 nome,
 className,
}: {
 exerciseId: string;
 nome: string;
 className?: string | undefined;
}) {
 const { data } = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
 const found = data?.find((e) => e.id === exerciseId);
 if (!found) return null;
 return <ExerciseExecutionCard exercise={{ ...found, nome }} className={className} />;
}
