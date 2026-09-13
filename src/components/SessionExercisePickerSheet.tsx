import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { exerciseThumbUrl } from "@/lib/exerciseMedia";
import { getExercises } from "@/lib/data/exercises";
import { getFavorites } from "@/lib/favorites";
import { getExerciseUsage } from "@/lib/exercise-usage";
import { getProfile } from "@/lib/data/profile";
import { rankSwapCandidates } from "@/lib/coach/swap";
import { useT } from "@/lib/i18n";
import type { Exercise } from "@/lib/types";

/**
 * Add an exercise without leaving the workout: favorites and recent picks come
 * first, so the common case is two taps and the rest timer keeps running.
 */
export function SessionExercisePickerSheet({
  open,
  onOpenChange,
  onPick,
  replacing = null,
  sessionExerciseIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exercise: Exercise) => void;
  /** When set, the sheet replaces this exercise: ranked alternatives come first. */
  replacing?: { exerciseId: string; nome: string } | null;
  sessionExerciseIds?: string[];
}) {
  const t = useT();
  const [term, setTerm] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setTerm("");
    setFavorites(getFavorites());
    setUsage(getExerciseUsage() as Record<string, number>);
  }, [open]);

  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises, enabled: open });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile, enabled: open });
  const all = exercisesQ.data ?? [];

  const suggested = useMemo(() => {
    if (!replacing || term.trim()) return [];
    return rankSwapCandidates(replacing.exerciseId, all, {
      profile: profileQ.data ?? null,
      excludeIds: sessionExerciseIds,
      historyIds: Object.keys(usage),
      limit: 4,
    });
  }, [replacing, term, all, profileQ.data, sessionExerciseIds, usage]);

  const list = useMemo(() => {
    const q = term.trim().toLowerCase();
    const filtered = all.filter(
      (e) => !q || e.nome.toLowerCase().includes(q) || e.grupoPrimario.toLowerCase().includes(q),
    );
    // Favorites first, then most used, then alphabetical.
    return [...filtered].sort((a, b) => {
      const favA = favorites.includes(a.id) ? 1 : 0;
      const favB = favorites.includes(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      const useA = usage[a.id] ?? 0;
      const useB = usage[b.id] ?? 0;
      if (useA !== useB) return useB - useA;
      return a.nome.localeCompare(b.nome);
    });
  }, [all, term, favorites, usage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>
            {replacing ? t("Replace {name}", { name: replacing.nome }) : t("Add exercise")}
          </SheetTitle>
        </SheetHeader>

        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("Search exercises")}
          className="mt-3 h-11"
          autoFocus
        />

        {suggested.length ? (
          <section className="mt-3">
            <h3 className="label-caps mb-1.5 flex items-center gap-1.5 text-primary">
              <Sparkles className="size-3.5" /> {t("Suggested · same muscle")}
            </h3>
            <ul className="space-y-2">
              {suggested.map((e) => (
                <li key={`sug-${e.id}`}>
                  <button
                    type="button"
                    onClick={() => onPick(e)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-3 text-left"
                  >
                    <ExerciseThumb
                      grupo={e.grupoPrimario}
                      nome={e.nome}
                      src={exerciseThumbUrl(e)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm font-semibold leading-tight">
                        {e.nome}
                      </span>
                      <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                        {e.grupoPrimario} · {e.equipamento}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="label-caps mb-1.5 mt-4">{t("All exercises")}</h3>
          </section>
        ) : null}

        <ul className="mt-3 space-y-2 pb-6">
          {list.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
              >
                <ExerciseThumb grupo={e.grupoPrimario} nome={e.nome} src={exerciseThumbUrl(e)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-semibold leading-tight">
                    {e.nome}
                  </span>
                  <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                    {e.grupoPrimario} · {e.equipamento}
                  </span>
                </span>
                {favorites.includes(e.id) ? (
                  <Star className="size-4 shrink-0 fill-train text-train" />
                ) : null}
              </button>
            </li>
          ))}
          {exercisesQ.isSuccess && list.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              {t("No exercises found.")}
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
