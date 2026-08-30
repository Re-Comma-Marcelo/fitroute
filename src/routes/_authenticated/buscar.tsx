import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Dumbbell, ListChecks, Salad, Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getExercises } from "@/lib/data/exercises";
import { getRoutines } from "@/lib/data/routines";
import { getMeals } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/buscar")({
  head: () => ({
    meta: pageMeta({
      title: "Search",
      description: "Find an exercise, a routine or a meal and jump straight to it.",
      ogDescription: "One search across exercises, routines and meals.",
    }),
  }),
  component: SearchPage,
});

type Hit =
  | { kind: "exercise"; id: string; title: string; subtitle: string }
  | { kind: "routine"; id: string; title: string; subtitle: string }
  | { kind: "meal"; id: string; title: string; subtitle: string };

function SearchPage() {
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const mealsQuery = useQuery({ queryKey: ["meals"], queryFn: () => getMeals() });

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: Hit[] = [];
    (routinesQuery.data ?? [])
      .filter((r) => r.nome.toLowerCase().includes(term))
      .forEach((r) =>
        out.push({
          kind: "routine",
          id: r.id,
          title: r.nome,
          subtitle: t("{n} exercises", { n: r.exercicios.length }),
        }),
      );
    (exercisesQuery.data ?? [])
      .filter(
        (e) =>
          e.nome.toLowerCase().includes(term) ||
          e.grupoPrimario.toLowerCase().includes(term) ||
          e.equipamento.toLowerCase().includes(term),
      )
      .slice(0, 30)
      .forEach((e) =>
        out.push({
          kind: "exercise",
          id: e.id,
          title: e.nome,
          subtitle: `${e.grupoPrimario} · ${e.equipamento}`,
        }),
      );
    (mealsQuery.data ?? [])
      .filter((m) => m.name.toLowerCase().includes(term))
      .slice(0, 20)
      .forEach((m) =>
        out.push({
          kind: "meal",
          id: m.id,
          title: m.name,
          subtitle: t("{kcal} kcal", { kcal: Math.round(m.kcal) }),
        }),
      );
    return out;
  }, [q, exercisesQuery.data, routinesQuery.data, mealsQuery.data, t]);

  function open(hit: Hit) {
    if (hit.kind === "routine") navigate({ to: "/rotina/$id", params: { id: hit.id } });
    else if (hit.kind === "exercise") navigate({ to: "/biblioteca", search: {} });
    else navigate({ to: "/dieta" });
  }

  const Icon = { exercise: Dumbbell, routine: ListChecks, meal: Salad } as const;

  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader
        title={t("Search")}
        left={
          <Button
            variant="ghost"
            size="icon"
            className="tap-target"
            aria-label={t("Back")}
            onClick={() => navigate({ to: "/inicio" })}
          >
            <ArrowLeft className="size-6" />
          </Button>
        }
      />

      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Exercise, routine or meal")}
            aria-label={t("Search")}
            className="h-12 pl-9"
          />
        </div>

        {q.trim().length < 2 ? (
          <p className="text-sm text-muted-foreground">
            {t("Type at least two letters to search.")}
          </p>
        ) : hits.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Nothing found for “{q}”.", { q })}</p>
        ) : (
          <ul className="space-y-2">
            {hits.map((hit) => {
              const HitIcon = Icon[hit.kind];
              return (
                <li key={`${hit.kind}:${hit.id}`}>
                  <button
                    type="button"
                    onClick={() => open(hit)}
                    className="tap-target flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted-foreground">
                      <HitIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{hit.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
