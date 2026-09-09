import { DAY_KEYS, SLOT_PARTS, type SlotGrid, type SlotState } from "@/lib/plan/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NEXT: Record<SlotState, SlotState> = { blocked: "free", free: "tight", tight: "blocked" };

const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function WeeklySlotGrid({
  value,
  onChange,
}: {
  value: SlotGrid;
  onChange: (next: SlotGrid) => void;
}) {
  const t = useT();

  const cycle = (day: string, part: string) => {
    const dayKey = day as keyof SlotGrid;
    const partKey = part as keyof SlotGrid["mon"];
    onChange({
      ...value,
      [dayKey]: { ...value[dayKey], [partKey]: NEXT[value[dayKey][partKey]] },
    });
  };

  return (
    <div className="space-y-2">
      <div className="eyebrow-type grid grid-cols-[3rem_repeat(3,1fr)] gap-1.5 text-[11px] text-muted-foreground">
        <span />
        {SLOT_PARTS.map((part) => (
          <span key={part} className="text-center">
            {t(part === "morning" ? "Morning" : part === "midday" ? "Midday" : "Evening")}
          </span>
        ))}
      </div>
      {DAY_KEYS.map((day) => (
        <div key={day} className="grid grid-cols-[3rem_repeat(3,1fr)] items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t(DAY_LABEL[day] ?? "")}
          </span>
          {SLOT_PARTS.map((part) => {
            const state = value[day][part];
            return (
              <button
                key={part}
                type="button"
                onClick={() => cycle(day, part)}
                aria-label={`${t(DAY_LABEL[day] ?? "")} ${part}: ${state}`}
                className={cn(
                  "h-11 rounded-lg border text-xs font-medium transition-colors active:scale-[0.98]",
                  state === "free" && "border-primary/50 bg-primary/15 text-primary",
                  state === "tight" && "border-warn/40 bg-warn/10 text-warn",
                  state === "blocked" && "border-border/60 bg-muted/20 text-muted-foreground",
                )}
              >
                {t(state === "free" ? "Free" : state === "tight" ? "Tight" : "Busy")}
              </button>
            );
          })}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {t("Tap a block to cycle busy → free → tight. No need to count hours — we work that out.")}
      </p>
    </div>
  );
}
