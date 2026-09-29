import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExercises } from "@/lib/data/exercises";
import { exerciseImage } from "@/lib/exercise-image";
import { exerciseThumbUrl } from "@/lib/exerciseMedia";
import { cn } from "@/lib/utils";

/**
 * Miniatura do exercício: usa o thumb real do catálogo quando existe e cai na
 * ilustração do grupo muscular se a imagem falhar ou não houver mídia.
 *
 * With an `exerciseId` and no `src`, the thumb and group are read from the
 * (cached) catalog, so a caller that only holds a session or routine row
 * still gets the real picture. `round` crops it into a circle — the avatar
 * that sits next to an exercise name.
 */
export function ExerciseThumb({
  exerciseId,
  grupo,
  nome,
  src,
  round = false,
  className,
}: {
  exerciseId?: string | undefined;
  grupo?: string | null | undefined;
  nome?: string | undefined;
  src?: string | null | undefined;
  round?: boolean;
  className?: string | undefined;
}) {
  // Remember which picture failed, so a thumb reused for another exercise tries again.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const lookup = Boolean(exerciseId) && src === undefined;
  const catalog = useQuery({ queryKey: ["exercises"], queryFn: getExercises, enabled: lookup });
  const exercise = lookup ? catalog.data?.find((e) => e.id === exerciseId) : undefined;
  const mediaSrc = lookup ? (exercise ? exerciseThumbUrl(exercise) : null) : src;
  const group = grupo ?? exercise?.grupoPrimario;
  const useMedia = Boolean(mediaSrc) && mediaSrc !== failedSrc;

  return (
    <span
      className={cn(
        "relative block size-11 shrink-0 overflow-hidden border border-border bg-muted",
        round ? "rounded-full" : "rounded-xl",
        className,
      )}
    >
      <img
        src={useMedia ? (mediaSrc as string) : exerciseImage(group)}
        alt={nome ? `Illustration of ${nome}` : ""}
        loading="lazy"
        decoding="async"
        width={512}
        height={512}
        onError={() => {
          if (useMedia) setFailedSrc(mediaSrc ?? null);
        }}
        className={cn(
          "size-full",
          useMedia && !round ? "object-contain" : "object-cover",
          !useMedia && "brightness-110",
        )}
      />
      {useMedia ? null : (
        <span className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      )}
    </span>
  );
}
