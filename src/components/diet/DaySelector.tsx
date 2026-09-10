import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addDays, isoDate } from "@/lib/data/nutrition";
import { useT } from "@/lib/i18n";

function labelFor(date: string, t: (s: string, v?: Record<string, string | number>) => string) {
  const today = isoDate(new Date());
  if (date === today) return t("Today");
  if (date === isoDate(addDays(new Date(), -1))) return t("Yesterday");
  if (date === isoDate(addDays(new Date(), 1))) return t("Tomorrow");
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "Today" with a dropdown for the surrounding days. The page follows it. */
export function DaySelector({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  const t = useT();
  const options = [1, 0, -1, -2, -3, -4, -5, -6, -7].map((offset) =>
    isoDate(addDays(new Date(), offset)),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="tap-target flex items-center gap-1.5 text-left">
        <span className="font-display text-xl font-semibold tracking-tight">
          {labelFor(date, t)}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {options.map((d) => (
          <DropdownMenuItem
            key={d}
            onClick={() => onChange(d)}
            className={d === date ? "text-diet" : ""}
          >
            {labelFor(d, t)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
