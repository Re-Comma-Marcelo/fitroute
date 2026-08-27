import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { hoursLabel } from "@/lib/plan/life";
import type { TimeAdjust, TimeBudget } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Plays the derived week back in words so the user can confirm or nudge it. */
export function TimeReadBack({
  budget,
  sportSessions,
  adjust,
  onAdjust,
}: {
  budget: TimeBudget;
  sportSessions: number;
  adjust: TimeAdjust;
  onAdjust: (next: TimeAdjust) => void;
}) {
  const t = useT();

  const slotPhrase = budget.gymSlots
    .map((slot) => `${t(DAY_LABEL[slot.day])} ${t(slot.part)}`)
    .join(", ");

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm leading-relaxed">
        {budget.gymSlots.length === 0
          ? t("I can't find a usable slot in your week yet — mark at least one block above.")
          : sportSessions > 0
            ? t(
                "So {slots} look open — that's roughly {time} a week for the gym, on top of your {sports} sport session(s). Sound right?",
                { slots: slotPhrase, time: hoursLabel(budget.gymMinutesPerWeek), sports: sportSessions },
              )
            : t("So {slots} look open — that's roughly {time} a week you can spend training. Sound right?", {
                slots: slotPhrase,
                time: hoursLabel(budget.gymMinutesPerWeek),
              })}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {budget.gymSlots.map((slot) => (
          <span
            key={`${slot.day}-${slot.part}`}
            className="rounded-full bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
          >
            {t(DAY_LABEL[slot.day])} · {slot.minutes} {t("min")}
          </span>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(
          [
            { key: "less", label: "Less than that", icon: Minus },
            { key: "asIs", label: "That's right", icon: Check },
            { key: "more", label: "I have more time", icon: Plus },
          ] as { key: TimeAdjust; label: string; icon: typeof Check }[]
        ).map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            onClick={() => onAdjust(key)}
            className={cn(
              "h-11 flex-1 gap-1.5 px-2 text-xs",
              adjust === key && "border-primary/60 bg-primary/15 text-primary",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(label)}
          </Button>
        ))}
      </div>

      {budget.recoveryFactor < 1 ? (
        <p className="text-xs text-muted-foreground">
          {t("Your sleep, stress and sport load mean we keep the weekly volume a bit lower on purpose.")}
        </p>
      ) : null}
    </div>
  );
}
