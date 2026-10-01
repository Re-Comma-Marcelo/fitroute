import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface DayBarDay {
  /** yyyy-mm-dd */
  iso: string;
  /** Two-letter label, e.g. "MO". */
  label: string;
  training: boolean;
  isToday: boolean;
}

/**
 * The week, Monday first. Training days carry a turquoise dot, rest days are
 * dimmed, today has a turquoise outline and the selected day is filled.
 */
export function DayBar({
  days,
  selected,
  onSelect,
  className,
}: {
  days: DayBarDay[];
  selected: string;
  onSelect: (iso: string) => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label={t("This week")}
      className={cn("glass grid grid-cols-7 gap-1 rounded-daybar p-1", className)}
    >
      {days.map((d) => {
        const isSelected = d.iso === selected;
        return (
          <button
            key={d.iso}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-current={d.isToday ? "date" : undefined}
            onClick={() => onSelect(d.iso)}
            className={cn(
              "flex h-day flex-col items-center justify-center gap-1 rounded-day font-label text-label font-medium uppercase tracking-[var(--tracking-label)]",
              isSelected
                ? "bg-fj-accent text-fj-on-accent"
                : d.training
                  ? "text-fj-text"
                  : "text-fj-inactive",
              d.isToday && !isSelected && "shadow-[inset_0_0_0_1px_var(--accent)]",
            )}
          >
            <span>{d.label}</span>
            {d.training ? (
              <span
                aria-hidden
                className={cn(
                  "size-1 rounded-full",
                  isSelected ? "bg-fj-on-accent" : "bg-fj-accent",
                )}
              />
            ) : (
              <span className="text-micro normal-case leading-none tracking-normal opacity-80">
                {t("rest")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
