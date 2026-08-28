import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import {
  DEFAULT_SCHEDULE,
  MEAL_SLOTS,
  SLOT_LABEL,
  hourOf,
  saveMealSchedule,
} from "@/lib/data/nutrition";
import type { MealSchedule } from "@/lib/nutrition-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: MealSchedule;
}

export function MealScheduleSheet({ open, onOpenChange, schedule }: Props) {
  const t = useT();
  const [draft, setDraft] = useState<MealSchedule>(schedule);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setDraft(schedule);
  }, [open, schedule]);

  const save = useMutation({
    mutationFn: () => saveMealSchedule(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mealSchedule"] });
      onOpenChange(false);
    },
  });

  const ordered = [...MEAL_SLOTS].sort((a, b) => hourOf(draft[a].time) - hourOf(draft[b].time));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t("Meal timing")}</SheetTitle>
          <SheetDescription>
            {t("Set when you usually eat. Slots follow your schedule automatically.")}
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-2">
          {ordered.map((slot) => {
            const s = draft[slot];
            return (
              <li
                key={slot}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t(SLOT_LABEL[slot])}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.enabled ? t("In your day") : t("Skipped")}
                  </p>
                </div>
                <input
                  type="time"
                  value={s.time}
                  disabled={!s.enabled}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [slot]: { ...d[slot], time: e.target.value } }))
                  }
                  className="tap-target rounded-lg border border-border bg-background px-3 text-sm tabular-nums disabled:opacity-40"
                />
                <Switch
                  checked={s.enabled}
                  aria-label={t("Include {slot}", { slot: t(SLOT_LABEL[slot]) })}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, [slot]: { ...d[slot], enabled: v } }))
                  }
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="tap-target flex-1"
            onClick={() => setDraft(DEFAULT_SCHEDULE)}
          >
            {t("Reset")}
          </Button>
          <Button
            className="tap-target flex-1"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {t("Save timing")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
