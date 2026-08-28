import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/CountUp";
import { getWorkout, getWorkoutSets } from "@/lib/data/workouts";
import { formatDurationShort, formatKg } from "@/lib/format";
import { hapticSuccess } from "@/lib/haptics";
import heroLogin from "@/assets/hero-login.jpg";

export const Route = createFileRoute("/_authenticated/resumo/$id")({
  head: () => ({
    meta: pageMeta({
      title: "Workout summary",
      description: "Duration, total volume, logged sets and personal records hit in this session.",
      ogDescription: "Duration, volume, sets and PRs from your session.",
    }),
  }),
  component: SummaryPage,
});

type PrEntry = { nome: string; pesoKg: number; anteriorKg?: number };

function SummaryPage() {
  const t = useT();
  const { id } = useParams({ from: "/_authenticated/resumo/$id" });
  const [prs, setPrs] = useState<PrEntry[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`forja.resumo.${id}`);
      const parsed = raw ? ((JSON.parse(raw).prs ?? []) as PrEntry[]) : [];
      setPrs(parsed);
      // Celebrate the record once, when the summary first appears.
      if (parsed.length) hapticSuccess();
    } catch {
      setPrs([]);
    }
  }, [id]);

  const workoutQuery = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout(id) });
  const setsQuery = useQuery({ queryKey: ["workoutSets", id], queryFn: () => getWorkoutSets(id) });

  const workout = workoutQuery.data;
  const sets = setsQuery.data ?? [];

  return (
    <div className="relative min-h-screen bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
        <img
          src={heroLogin}
          alt=""
          loading="lazy"
          width={1024}
          height={1536}
          className="size-full object-cover opacity-40"
        />
        <div className="veil absolute inset-0" />
      </div>
      <div className="relative mx-auto max-w-md">
        <p className="label-caps">{t("Session finished")}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("Workout done")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Good work. Here is the summary.")}</p>

        {prs.length ? (
          <section
            aria-label={t("New personal records")}
            className="pr-pop mt-6 overflow-hidden rounded-3xl border border-success/40 bg-success-bg p-5"
          >
            <div className="flex items-center gap-2 text-success">
              <Trophy className="size-5" />
              <p className="text-xs font-medium uppercase tracking-[0.02em]">
                {prs.length > 1
                  ? t("{count} new personal records", { count: prs.length })
                  : t("New personal record")}
              </p>
            </div>
            <ul className="mt-4 space-y-4">
              {prs.map((pr) => {
                const delta =
                  pr.anteriorKg && pr.anteriorKg > 0
                    ? Math.round((pr.pesoKg - pr.anteriorKg) * 10) / 10
                    : 0;
                return (
                  <li key={pr.nome}>
                    <p className="text-sm font-medium text-foreground">{pr.nome}</p>
                    <CountUp
                      value={pr.pesoKg}
                      format={formatKg}
                      className="num-hero block text-success"
                    />

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {delta > 0
                        ? t("{delta} over your previous best of {previous}", {
                            delta: formatKg(delta),
                            previous: formatKg(pr.anteriorKg ?? 0),
                          })
                        : t("First time logged at this load")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <Stat label={t("Duration")} value={workout ? formatDurationShort(workout.duracaoSeg) : "—"} />
          <Stat label={t("Total volume")} value={workout ? formatKg(workout.volumeTotalKg) : "—"} />
          <Stat label={t("Sets")} value={String(sets.length)} />
          <Stat label={t("Exercises")} value={String(new Set(sets.map((s) => s.exerciseId)).size)} />
        </dl>


        {workout?.notas ? (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">{workout.notas}</p>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button asChild className="h-14 w-full text-base font-semibold">
            <Link to="/progresso/$id" params={{ id }}>
              {t("View session details")}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-12 w-full text-sm font-medium text-muted-foreground">
            <Link to="/treino">{t("Back to start")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="label-caps">{label}</dt>
      <dd className="num-big mt-1">{value}</dd>
    </div>
  );
}
