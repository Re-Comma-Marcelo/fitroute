import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/CountUp";
import { getWorkout, getWorkouts, getWorkoutSets } from "@/lib/data/workouts";
import { weekStreak } from "@/lib/home-metrics";
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
    const key = `forja.resumo.${id}`;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? ((JSON.parse(raw).prs ?? []) as PrEntry[]) : [];
      setPrs(parsed);
      // Celebrate the record once, when the summary first appears.
      if (parsed.length) hapticSuccess();
    } catch {
      setPrs([]);
    }
    // Consumed once: keep localStorage from accumulating one key per workout.
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }, [id]);

  const workoutQuery = useQuery({ queryKey: ["workout", id], queryFn: () => getWorkout(id) });
  const setsQuery = useQuery({ queryKey: ["workoutSets", id], queryFn: () => getWorkoutSets(id) });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });

  const workout = workoutQuery.data;
  const sets = setsQuery.data ?? [];
  const streak = weekStreak(workoutsQuery.data ?? []);
  const volume = workout?.volumeTotalKg ?? 0;

  return (
    <div className="route-enter relative min-h-screen bg-background px-4 py-10">
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

        {/* Hero: the volume moved in this session. */}
        <section className="mt-8" aria-label={t("Total volume")}>
          <p className="label-caps">{t("Total volume")}</p>
          <CountUp
            value={volume}
            format={formatKg}
            className="num-hero mt-1 block text-train"
            aria-label={formatKg(volume)}
          />
        </section>

        {prs.length ? (
          <section
            aria-label={t("New personal records")}
            className="mt-6 space-y-3"
          >
            {prs.map((pr, index) => {
              const delta =
                pr.anteriorKg && pr.anteriorKg > 0
                  ? Math.round((pr.pesoKg - pr.anteriorKg) * 10) / 10
                  : 0;
              return (
                <div
                  key={pr.nome}
                  className="pr-pop overflow-hidden rounded-3xl border border-success/40 bg-success-bg p-5"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-center gap-2 text-success">
                    <Trophy className="size-5" />
                    <p className="text-xs font-medium uppercase tracking-[0.02em]">
                      {t("New personal record")}
                    </p>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{pr.nome}</p>
                  <CountUp
                    value={pr.pesoKg}
                    format={formatKg}
                    className="num-hero block text-success"
                    aria-label={formatKg(pr.pesoKg)}
                  />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {delta > 0
                      ? t("{delta} over your previous best of {previous}", {
                          delta: formatKg(delta),
                          previous: formatKg(pr.anteriorKg ?? 0),
                        })
                      : t("First time logged at this load")}
                  </p>
                </div>
              );
            })}
          </section>
        ) : null}

        {streak > 0 ? (
          <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-success">
            <Flame className="size-4" />
            {streak > 1
              ? t("{count} weeks training in a row", { count: streak })
              : t("First week training — keep it going")}
          </p>
        ) : null}

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat
            label={t("Duration")}
            value={workout ? formatDurationShort(workout.duracaoSeg) : "—"}
          />
          <Stat label={t("Sets")} value={String(sets.length)} />
          <Stat
            label={t("Exercises")}
            value={String(new Set(sets.map((s) => s.exerciseId)).size)}
          />
        </dl>

        {workout?.notas ? (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
            {workout.notas}
          </p>
        ) : null}

        <div className="mt-8 space-y-3">
          <Button asChild className="h-14 w-full text-base font-semibold">
            <Link to="/inicio">{t("Back to start")}</Link>
          </Button>
          <p className="text-center">
            <Link
              to="/progresso/$id"
              params={{ id }}
              className="text-sm font-semibold text-muted-foreground underline-offset-2"
            >
              {t("View session details")}
            </Link>
          </p>
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
