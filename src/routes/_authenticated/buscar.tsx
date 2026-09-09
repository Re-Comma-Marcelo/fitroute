import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, Dumbbell, ListChecks, Salad, Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getExercises } from "@/lib/data/exercises";
import { getRoutines } from "@/lib/data/routines";
import { getMeals } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import { QueryError } from "@/components/QueryError";
import { clearRecentSearches, getRecentSearches, rememberSearch } from "@/lib/recent-searches";

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

function Shortcut({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Dumbbell;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left text-sm font-semibold"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted-foreground">
        <Icon className="size-4" />
      </span>
      {label}
    </button>
  );
}

function SearchPage() {
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => setRecents(getRecentSearches()), []);

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

  const failed = exercisesQuery.isError || routinesQuery.isError || mealsQuery.isError;

  function retry() {
    void exercisesQuery.refetch();
    void routinesQuery.refetch();
    void mealsQuery.refetch();
  }

  function open(hit: Hit) {
    rememberSearch(q);
    if (hit.kind === "routine") navigate({ to: "/rotina/$id", params: { id: hit.id } });
    else if (hit.kind === "exercise")
      navigate({
        to: "/biblioteca",
        search: { para: undefined, rotinaId: undefined, exercicioId: hit.id },
      });
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

        {failed ? (
          <QueryError onRetry={retry} />
        ) : q.trim().length < 2 ? (
          <div className="space-y-5">
            {recents.length ? (
              <section>
                <div className="flex items-center justify-between">
                  <p className="label-caps">{t("Recent searches")}</p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted-foreground"
                    onClick={() => {
                      clearRecentSearches();
                      setRecents([]);
                    }}
                  >
                    {t("Clear")}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recents.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQ(term)}
                      className="tap-target inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium"
                    >
                      <Clock className="size-3.5 text-muted-foreground" />
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <p className="label-caps">{t("Jump to")}</p>
              <div className="mt-2 grid gap-2">
                <Shortcut
                  icon={ListChecks}
                  label={t("My routines")}
                  onClick={() => navigate({ to: "/treino" })}
                />
                <Shortcut
                  icon={Dumbbell}
                  label={t("Exercise library")}
                  onClick={() =>
                    navigate({
                      to: "/biblioteca",
                      search: { para: undefined, rotinaId: undefined, exercicioId: undefined },
                    })
                  }
                />
                <Shortcut
                  icon={Salad}
                  label={t("Today's meals")}
                  onClick={() => navigate({ to: "/dieta" })}
                />
              </div>
            </section>

            <p className="text-xs text-muted-foreground">
              {t("Type at least two letters to search.")}
            </p>
          </div>
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
                    className="tap-target flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left"
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
