import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getBodyWeightLog, logBodyWeight } from "@/lib/data/body-weight";
import { isoDate } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { useWeightUnit } from "@/lib/use-weight-unit";
import { weightUnitLabel } from "@/lib/format";

/** Always-on bar to log today's body weight in one tap, without leaving the home screen. */
export function WeightQuickLogBar() {
  const t = useT();
  const { unit } = useWeightUnit();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const logQuery = useQuery({ queryKey: ["body-weight"], queryFn: getBodyWeightLog });
  const today = isoDate(new Date());
  const todaysEntry = logQuery.data?.find((e) => e.data === today);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = Number(draft.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("invalid weight");
      await logBodyWeight(today, Math.round(fromDisplayWeight(parsed, unit) * 10) / 10);
    },
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["body-weight"] });
      toast.success(t("Weight logged."));
    },
    onError: () => toast.error(t("Could not log your weight. Check the value and try again.")),
  });

  return (
    <Card className="flex items-center gap-3 rounded-2xl border-border bg-card p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-muted-foreground">
        <Scale className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-caps">{t("Body weight today")}</p>
        {todaysEntry ? (
          <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-success">
            <Check className="size-3.5" />
            {Math.round(toDisplayWeight(todaysEntry.pesoKg, unit) * 10) / 10} {weightUnitLabel()}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">{t("Not logged yet")}</p>
        )}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        inputMode="decimal"
        enterKeyHint="done"
        placeholder={weightUnitLabel()}
        aria-label={t("Today in {unit}", { unit: weightUnitLabel() })}
        className="numeric-field h-11 w-16 shrink-0"
      />
      <Button
        className="tap-target h-11 shrink-0"
        size="sm"
        disabled={!draft.trim() || save.isPending}
        onClick={() => save.mutate()}
      >
        {t("Log")}
      </Button>
    </Card>
  );
}
