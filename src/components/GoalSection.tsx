import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile, saveProfile } from "@/lib/data/profile";
import { buildCoachContext } from "@/lib/route/context";
import { daysBetween, isoDay, addDays } from "@/lib/route/cadence";
import { suggestGoalDate } from "@/lib/route-ai.functions";
import { formatDate, weightUnitLabel } from "@/lib/format";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { useLanguage, useT } from "@/lib/i18n";

/** The route needs a date to aim at; below this there is no room for checkpoints. */
const MIN_DAYS = 10;

/**
 * The goal behind the route: a target date and, optionally, a target body
 * weight. Shared by the Profile screen and the empty Route page so the goal
 * can be set wherever the user notices it is missing.
 */
export function GoalSection({ onSaved }: { onSaved?: () => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const { unit } = useWeightUnit();
  const queryClient = useQueryClient();
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profile = profileQ.data;

  const [date, setDate] = useState("");
  const [weightText, setWeightText] = useState("");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDate(profile.metaPrazo ?? "");
    setWeightText(
      profile.pesoMetaKg
        ? String(Math.round(toDisplayWeight(profile.pesoMetaKg, unit) * 10) / 10)
        : "",
    );
  }, [profile, unit]);

  const today = isoDay(new Date());
  const daysOut = date ? daysBetween(today, date) : null;
  const tooClose = daysOut !== null && daysOut < MIN_DAYS;
  const dirty = Boolean(
    profile &&
    (date !== (profile.metaPrazo ?? "") ||
      weightText !==
        (profile.pesoMetaKg
          ? String(Math.round(toDisplayWeight(profile.pesoMetaKg, unit) * 10) / 10)
          : "")),
  );

  const quickPicks = useMemo(
    () => [
      { label: t("3 months"), date: isoDay(addDays(today, 90)) },
      { label: t("6 months"), date: isoDay(addDays(today, 180)) },
      { label: t("1 year"), date: isoDay(addDays(today, 365)) },
    ],
    [today, t],
  );

  const suggest = useMutation({
    mutationFn: async () => {
      const context = await buildCoachContext();
      const result = (await suggestGoalDate({ data: { context, language: lang } })) as
        { ok: true; date: string; months: number; reason: string } | { ok: false; error: string };
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      setDate(result.date);
      setReason(result.reason);
    },
    onError: () => toast.error(t("Could not work out a date right now. Pick one yourself.")),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("no-profile");
      const parsed = Number(weightText.replace(",", "."));
      const targetKg =
        weightText.trim() && Number.isFinite(parsed) ? fromDisplayWeight(parsed, unit) : undefined;
      await saveProfile({
        ...profile,
        ...(date ? { metaPrazo: date } : {}),
        ...(targetKg ? { pesoMetaKg: Math.round(targetKg * 10) / 10 } : {}),
        ...(profile.metaIniciadaEm ? {} : { metaIniciadaEm: today }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("Goal saved."));
      onSaved?.();
    },
    onError: () => toast.error(t("Could not save your goal.")),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="goal-date">{t("Target date")}</Label>
        <Input
          id="goal-date"
          type="date"
          min={isoDay(addDays(today, MIN_DAYS))}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setReason(null);
          }}
          className="tap-target h-12 text-base"
        />
        <div className="flex gap-2">
          {quickPicks.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setDate(q.date);
                setReason(null);
              }}
              className={cn(
                "tap-target flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                date === q.date
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="tap-target w-full justify-start px-2 text-xs"
          disabled={suggest.isPending}
          onClick={() => suggest.mutate()}
        >
          <Sparkles className="size-4" />
          {suggest.isPending ? t("Working it out...") : t("Let the coach decide what's realistic")}
        </Button>
        {reason ? (
          <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs leading-snug text-primary">
            {reason}
          </p>
        ) : null}
        {tooClose ? (
          <p className="text-xs leading-snug text-destructive">
            {t(
              "Pick a date at least {n} days out — there is no room for checkpoints before that.",
              {
                n: String(MIN_DAYS),
              },
            )}
          </p>
        ) : date ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("{date} · {n} days from today", { date: formatDate(date), n: String(daysOut ?? 0) })}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-weight">
          {t("Target body weight ({unit}, optional)", { unit: weightUnitLabel() })}
        </Label>
        <Input
          id="goal-weight"
          inputMode="decimal"
          value={weightText}
          onChange={(e) => setWeightText(e.target.value)}
          placeholder={t("Leave empty if weight isn't the point")}
          className="tap-target h-12 text-base"
        />
      </div>

      <Button
        type="button"
        className="tap-target w-full"
        disabled={!dirty || tooClose || !date || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? t("Saving...") : t("Save goal")}
      </Button>
    </div>
  );
}
