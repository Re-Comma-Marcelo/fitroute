import { useState } from "react";
import { exerciseImage } from "@/lib/exercise-image";
import { cn } from "@/lib/utils";

/**
 * Miniatura do exercício: usa o thumb real do catálogo quando existe e cai na
 * ilustração do grupo muscular se a imagem falhar ou não houver mídia.
 */
export function ExerciseThumb({
  grupo,
  nome,
  src,
  className,
}: {
  grupo?: string | null | undefined;
  nome?: string | undefined;
  src?: string | null | undefined;
  className?: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  const useMedia = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative block size-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      <img
        src={useMedia ? (src as string) : exerciseImage(grupo)}
        alt={nome ? `Illustration of ${nome}` : ""}
        loading="lazy"
        decoding="async"
        width={512}
        height={512}
        onError={() => setFailed(true)}
        className={cn("size-full", useMedia ? "object-contain" : "object-cover brightness-110")}
      />
      {useMedia ? null : (
        <span className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      )}
    </span>
  );
}
