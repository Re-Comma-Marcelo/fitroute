import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getBodyWeightLog, logBodyWeight } from "@/lib/data/body-weight";
import { isoDate } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import { addDays, isoDay } from "@/lib/route/cadence";
import { weeklyAverage } from "@/lib/route/weight-progress";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { weightUnitLabel } from "@/lib/format";
import { GlassCard, MonoLabel } from "./GlassCard";
import { Metric } from "./Metric";
import { PillButton } from "./PillButton";

/**
 * First thing on Home: today's weigh-in. Not every day is needed — the route
 * reads the week's average, so this also shows how many weigh-ins the
 * current week has and what they average out to.
 */
export function TodayWeightCard() {
  const t = useT();
  const { unit } = useWeightUnit();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const logQ = useQuery({ queryKey: ["body-weight"], queryFn: getBodyWeightLog });
  const entries = logQ.data ?? [];
  const today = isoDate(new Date());
  const todaysEntry = entries.find((e) => e.data === today);
  const weekStart = isoDay(addDays(new Date(), -6));
  const weekCount = entries.filter((e) => e.data >= weekStart && e.data <= today).length;
  const weekAvg = weeklyAverage(entries, weekStart);
  const shown = (kg: number) => Math.round(toDisplayWeight(kg, unit) * 10) / 10;

  const save = useMutation({
    mutationFn: async () => {
      const parsed = Number(draft.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("invalid weight");
      await logBodyWeight(today, Math.round(fromDisplayWeight(parsed, unit) * 10) / 10);
    },
    onSuccess: async () => {
      setDraft("");
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["body-weight"] });
      toast.success(t("Weight logged."));
    },
    onError: () => toast.error(t("Could not log your weight. Check the value and try again.")),
  });

  const showInput = !todaysEntry || editing;

  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <MonoLabel>{t("How much do you weigh today?")}</MonoLabel>
          {todaysEntry && !editing ? (
            <div className="mt-1 flex items-center gap-2">
              <Metric
                value={String(shown(todaysEntry.pesoKg))}
                unit={weightUnitLabel()}
                size={28}
              />
              <Check className="size-4 text-fj-recovery" aria-hidden />
            </div>
          ) : null}
        </div>
        {showInput ? (
          <form
            className="flex shrink-0 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) save.mutate();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              inputMode="decimal"
              enterKeyHint="done"
              placeholder={weightUnitLabel()}
              aria-label={t("Today in {unit}", { unit: weightUnitLabel() })}
              className="numeric-field h-11 w-20"
            />
            <PillButton type="submit" disabled={!draft.trim() || save.isPending}>
              {t("Log")}
            </PillButton>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("Change today's weight")}
            className="tap-target grid size-11 shrink-0 place-items-center rounded-full text-fj-label"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-meta text-fj-label">
        {weekAvg !== null
          ? t("This week: {avg} {unit} average · {count} weigh-in(s)", {
              avg: shown(weekAvg),
              unit: weightUnitLabel(),
              count: weekCount,
            })
          : t("A few weigh-ins a week is enough — your route uses the weekly average.")}
      </p>
    </GlassCard>
  );
}
