import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  DEFAULT_SCHEDULE,
  MEAL_SLOTS,
  SLOT_LABEL,
  hourOf,
  saveMealSchedule,
} from "@/lib/data/nutrition";
import type { MealSchedule, MealSlot } from "@/lib/nutrition-types";

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

  const inDay = MEAL_SLOTS.filter((s) => draft[s].enabled).sort(
    (a, b) => hourOf(draft[a].time) - hourOf(draft[b].time),
  );
  const available = MEAL_SLOTS.filter((s) => !draft[s].enabled);

  const setEnabled = (slot: MealSlot, enabled: boolean) =>
    setDraft((d) => ({ ...d, [slot]: { ...d[slot], enabled } }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t("Your meals")}</SheetTitle>
          <SheetDescription>
            {t(
              "Add the meals you eat, remove the ones you skip and set when you usually eat them.",
            )}
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-2">
          {inDay.map((slot) => (
            <li
              key={slot}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <p className="min-w-0 flex-1 text-sm font-semibold">{t(SLOT_LABEL[slot])}</p>
              <input
                type="time"
                value={draft[slot].time}
                aria-label={t("Time for {slot}", { slot: t(SLOT_LABEL[slot]) })}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [slot]: { ...d[slot], time: e.target.value } }))
                }
                className="tap-target rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
              />
              {/* The day keeps at least one meal: an empty schedule has no "now". */}
              <button
                type="button"
                onClick={() => setEnabled(slot, false)}
                disabled={inDay.length <= 1}
                aria-label={t("Remove {slot}", { slot: t(SLOT_LABEL[slot]) })}
                className="tap-target flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        {available.length ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {t("Add a meal to your day")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {available.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setEnabled(slot, true)}
                  className="tap-target flex items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-diet hover:text-diet"
                >
                  <Plus className="size-3" /> {t(SLOT_LABEL[slot])}
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
