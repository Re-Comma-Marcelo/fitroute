import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/QueryError";
import { WeekMenuGrid, type WeekMenuOption } from "@/components/diet/WeekMenuGrid";

import { rankMeals } from "@/lib/nutrition-swap";
import { useT } from "@/lib/i18n";
import {
  MEAL_SLOTS,
  SLOT_LABEL,
  activeSlots,
  getMealSchedule,
  getMeals,
  getTargets,
  getTrainingTags,
  weekDates,
} from "@/lib/data/nutrition";
import { getWeekMenu, saveWeekSelection } from "@/lib/data/week-menu";
import type { DayTotals, MealSlot } from "@/lib/nutrition-types";

export const Route = createFileRoute("/_authenticated/dieta/interview")({
  head: () => ({
    meta: pageMeta({
      title: "Pick this week's meals",
      description:
        "Tap the meals you feel like eating this week and the app builds one merged shopping list from them.",
      ogDescription:
        "A 30-second weekly pick: choose your meals, get a merged shopping list and a menu for the week.",
    }),
  }),
  component: InterviewPage,
});

const EMPTY: DayTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
/** Suggestions kept per category, so one slot never eats the whole pool. */
const POOL_PER_SLOT = 12;
const FIRST_PAGE = 4;
const PAGE_STEP = 4;

function InterviewPage() {
  const t = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Partial<Record<MealSlot, boolean>>>({ breakfast: true });
  const [rounds, setRounds] = useState<Partial<Record<MealSlot, number>>>({});
  const [selected, setSelected] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => weekDates(), []);
  const scheduleQ = useQuery({ queryKey: ["mealSchedule"], queryFn: getMealSchedule });
  const mealsQ = useQuery({ queryKey: ["meals", "all"], queryFn: () => getMeals() });
  const targetsQ = useQuery({ queryKey: ["nutritionTargets"], queryFn: getTargets });
  const menuQ = useQuery({ queryKey: ["weekMenu"], queryFn: getWeekMenu });
  const tagsQ = useQuery({
    queryKey: ["trainingTags", "week"],
    queryFn: () => getTrainingTags(dates),
  });

  const picks = selected ?? menuQ.data?.mealIds ?? [];

  /** Same coach logic as the diet page: macro fit per eating moment. */
  const groups = useMemo<{ slot: MealSlot; pool: WeekMenuOption[] }[]>(() => {
    const schedule = scheduleQ.data;
    const meals = mealsQ.data ?? [];
    const targets = targetsQ.data;
    if (!schedule || !targets || !meals.length) return [];
    const tags = Object.values(tagsQ.data ?? {});
    const seen = new Set<string>();
    const slots = activeSlots(schedule);
    // Fixed order so the day reads top to bottom, whatever the user's times are.
    const ordered = MEAL_SLOTS.filter((s) => slots.includes(s));
    return ordered.map((slot) => {
      const ranked = rankMeals(
        meals.filter((m) => m.slots.includes(slot) && !seen.has(m.id)),
        { slot, targets, dayTotals: EMPTY, recentTags: tags },
      );
      const pool = ranked.slice(0, POOL_PER_SLOT).map((r) => {
        seen.add(r.meal.id);
        return { meal: r.meal, slot };
      });
      return { slot, pool };
    });
  }, [scheduleQ.data, mealsQ.data, targetsQ.data, tagsQ.data]);

  const totalOptions = groups.reduce((n, g) => n + g.pool.length, 0);

  const loadError = scheduleQ.isError || mealsQ.isError || targetsQ.isError;
  const loading = !loadError && (scheduleQ.isLoading || mealsQ.isLoading || targetsQ.isLoading);

  function toggle(mealId: string) {
    setSelected(picks.includes(mealId) ? picks.filter((id) => id !== mealId) : [...picks, mealId]);
  }

  async function finish() {
    setSaving(true);
    try {
      await saveWeekSelection(picks, true);
      await qc.invalidateQueries({ queryKey: ["weekMenu"] });
      toast.success(t("Your shopping list is ready."));
      void navigate({ to: "/dieta/market" });
    } catch {
      toast.error(t("Could not save your choices. Try again."));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <QueryError
        message={t("Could not load meal suggestions.")}
        onRetry={() => {
          void scheduleQ.refetch();
          void mealsQ.refetch();
          void targetsQ.refetch();
        }}
      />
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <h1 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <Sparkles className="size-4 text-primary" /> {t("What do you feel like this week?")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Tap the meals you want. Takes about 30 seconds — the shopping list follows.")}
        </p>
        <p className="mt-2 text-xs font-semibold tabular-nums">
          {picks.length
            ? t("{n} of {total} selected", { n: picks.length, total: totalOptions })
            : t("Pick a few to get started")}
        </p>
      </section>

      <div className="mt-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const picked = g.pool.filter((o) => picks.includes(o.meal.id)).length;
              const shown = FIRST_PAGE + (rounds[g.slot] ?? 0) * PAGE_STEP;
              const visible = g.pool.slice(0, shown);
              const isOpen = Boolean(open[g.slot]);
              return (
                <Collapsible
                  key={g.slot}
                  open={isOpen}
                  onOpenChange={(v) => setOpen((o) => ({ ...o, [g.slot]: v }))}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <CollapsibleTrigger className="tap-target flex w-full items-center justify-between gap-2 px-3.5 text-left">
                    <span className="text-sm font-semibold">{t(SLOT_LABEL[g.slot])}</span>
                    <span className="flex items-center gap-2">
                      {picked ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                          {t("{n} selected", { n: picked })}
                        </span>
                      ) : null}
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <WeekMenuGrid options={visible} selected={picks} onToggle={toggle} />
                    {g.pool.length > visible.length ? (
                      <Button
                        variant="outline"
                        className="tap-target mt-2 w-full"
                        onClick={() => setRounds((r) => ({ ...r, [g.slot]: (r[g.slot] ?? 0) + 1 }))}
                      >
                        {t("Show me more")}
                      </Button>
                    ) : null}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-4 z-30 mt-4 pb-2">
        <Button
          className="tap-target w-full shadow-lg"
          disabled={saving || !picks.length}
          onClick={() => void finish()}
        >
          {picks.length
            ? t("Build my list ({n})", { n: picks.length })
            : t("Pick a few to get started")}
        </Button>
      </div>
    </>
  );
}
