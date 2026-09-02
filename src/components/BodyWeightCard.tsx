import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/QueryError";
import { getBodyWeightLog, logBodyWeight } from "@/lib/data/body-weight";
import { getProfile } from "@/lib/data/profile";
import { formatDate, formatDateLong, weightUnitLabel } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { weightPace } from "@/lib/weight-pace";

/**
 * Body weight trend: one entry per day, entered by hand. The chart is the
 * point — a single number hides whether a cut or bulk is actually moving.
 */
export function BodyWeightCard() {
  const t = useT();
  const { unit } = useWeightUnit();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const logQuery = useQuery({ queryKey: ["body-weight"], queryFn: getBodyWeightLog });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const entries = logQuery.data ?? [];

  /** Reads the log as a rate, so the goal gets a projected date. */
  const pace = useMemo(
    () =>
      weightPace(
        entries,
        profileQuery.data?.pesoMetaKg,
        profileQuery.data?.metaPrazo,
      ),
    [entries, profileQuery.data?.pesoMetaKg, profileQuery.data?.metaPrazo],
  );

  const save = useMutation({
    mutationFn: async () => {
      const parsed = Number(draft.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("invalid");
      const today = new Date().toISOString().slice(0, 10);
      await logBodyWeight(today, Math.round(fromDisplayWeight(parsed, unit) * 10) / 10);
    },
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["body-weight"] });
      toast.success(t("Weight logged."));
    },
    onError: () => toast.error(t("Could not log your weight. Check the value and try again.")),
  });

  const data = useMemo(
    () =>
      entries.map((e) => ({
        label: formatDate(e.data),
        peso: Math.round(toDisplayWeight(e.pesoKg, unit) * 10) / 10,
      })),
    [entries, unit],
  );

  const latest = entries[entries.length - 1];
  const first = entries[0];
  const delta =
    latest && first && latest.id !== first.id
      ? Math.round(toDisplayWeight(latest.pesoKg - first.pesoKg, unit) * 10) / 10
      : null;

  if (logQuery.isError) {
    return (
      <QueryError
        message={t("Could not load your weight log.")}
        onRetry={() => void logQuery.refetch()}
      />
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="label-caps">{t("Body weight")}</h2>
        {latest ? (
          <p className="font-display text-lg font-semibold tabular-nums">
            {Math.round(toDisplayWeight(latest.pesoKg, unit) * 10) / 10} {weightUnitLabel()}
            {delta !== null ? (
              <span className="ml-2 text-xs font-semibold text-muted-foreground">
                {delta > 0 ? "+" : ""}
                {delta} {weightUnitLabel()}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          placeholder={t("Today in {unit}", { unit: weightUnitLabel() })}
          aria-label={t("Today in {unit}", { unit: weightUnitLabel() })}
          className="numeric-field h-11 flex-1"
        />
        <Button
          className="tap-target"
          disabled={!draft.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {t("Log")}
        </Button>
      </div>

      {pace ? (
        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          {pace.wrongWay
            ? t("At this pace you are not moving towards your goal weight.")
            : t("{rate} {unit}/week — on this pace you hit your goal around {date}.", {
                rate:
                  (pace.ratePerWeek > 0 ? "+" : "") +
                  String(Math.round(toDisplayWeight(pace.ratePerWeek, unit) * 10) / 10),
                unit: weightUnitLabel(),
                date: pace.projectedDate ? formatDateLong(pace.projectedDate) : "—",
              })}
          {pace.weeksVsDeadline !== null && !pace.wrongWay
            ? pace.weeksVsDeadline >= 0
              ? " " + t("{weeks} weeks before your deadline.", { weeks: pace.weeksVsDeadline })
              : " " +
                t("{weeks} weeks after your deadline.", {
                  weeks: Math.abs(pace.weeksVsDeadline),
                })
            : null}
        </p>
      ) : null}


      {data.length > 1 ? (
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                width={46}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(value) => [`${value} ${weightUnitLabel()}`, t("Body weight")]}
              />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          {t("Log your weight a few times to see the trend line.")}
        </p>
      )}
    </section>
  );
}
