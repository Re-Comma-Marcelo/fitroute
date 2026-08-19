import { exerciseImage } from "@/lib/exercise-image";
import { cn } from "@/lib/utils";

/** Miniatura escura do exercício, derivada do grupo muscular. */
export function ExerciseThumb({
  grupo,
  nome,
  className,
}: {
  grupo?: string | null | undefined;
  nome?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "relative block size-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      <img
        src={exerciseImage(grupo)}
        alt={nome ? `Ilustração de ${nome}` : ""}
        loading="lazy"
        width={512}
        height={512}
        className="size-full object-cover opacity-90"
      />
      <span className="absolute inset-0 bg-background/25" />
    </span>
  );
}