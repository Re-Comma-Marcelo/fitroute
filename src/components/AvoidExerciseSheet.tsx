import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { useT } from "@/lib/i18n";
import type { Exercise } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Bottom sheet with search + muscle-group filter to flag exercises to avoid. */
export function AvoidExerciseSheet({
  open,
  exercises,
  selectedIds,
  onOpenChange,
  onToggle,
}: {
  open: boolean;
  exercises: Exercise[];
  selectedIds: string[];
  onOpenChange: (open: boolean) => void;
  onToggle: (exerciseId: string) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");

  const groups = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.grupoPrimario))).sort(),
    [exercises],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (group === "all" || e.grupoPrimario === group) &&
        (q === "" || e.nome.toLowerCase().includes(q)),
    );
  }, [exercises, group, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t("Exercises to avoid")}</SheetTitle>
        </SheetHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search exercise")}
          className="tap-target mt-3 h-11"
        />

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {["all", ...groups].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                g === group
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {g === "all" ? t("All") : g}
            </button>
          ))}
        </div>

        <ul className="mt-3 space-y-1.5 pb-6">
          {list.map((ex) => {
            const selected = selectedIds.includes(ex.id);
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => onToggle(ex.id)}
                  className={cn(
                    "tap-target flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors",
                    selected ? "border-destructive/60 bg-destructive/10" : "border-border bg-card",
                  )}
                >
                  <ExerciseThumb grupo={ex.grupoPrimario} nome={ex.nome} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{ex.nome}</span>
                    <span className="block truncate text-xs capitalize text-muted-foreground">
                      {ex.grupoPrimario}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                      selected
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selected ? t("Avoiding") : t("Add")}
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">
              {t("No exercise found")}
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
