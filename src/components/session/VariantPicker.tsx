import type { ExerciseVariant } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Picks how the exercise is being performed (e.g. grip) for sets not yet logged. */
export function VariantPicker({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ExerciseVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
}) {
  const t = useT();
  return (
    <div className="mb-2">
      <p className="label-caps mb-1">{t("How are you doing it today?")}</p>
      <div className="flex gap-1.5">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelect(variant.id)}
            className={cn(
              "tap-target rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selectedId === variant.id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t(variant.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
