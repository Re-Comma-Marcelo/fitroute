import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { formatKg } from "@/lib/format";
import {
  DEFAULT_PLATES_KG,
  getBarKg,
  groupPlates,
  plateBreakdown,
  setBarKg,
  setPlateSet,
  getPlateSet,
} from "@/lib/plates";
import { fromDisplayWeight, toDisplayWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

const BAR_OPTIONS_KG = [20, 15, 10, 7];

/**
 * How to load the bar for the weight on screen. Bar and available plates are
 * device settings, so a home gym with light plates gets honest math.
 */
export function PlateCalculatorSheet({ targetKg }: { targetKg: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [bar, setBar] = useState<number>(() => getBarKg());
  const [plates, setPlates] = useState<number[]>(() => getPlateSet());
  const [weight, setWeight] = useState<number>(targetKg);

  // Reopening picks up the current set weight again.
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setWeight(targetKg > 0 ? targetKg : getBarKg());
      setBar(getBarKg());
      setPlates(getPlateSet());
    }
  }

  const breakdown = useMemo(() => plateBreakdown(weight, bar, plates), [weight, bar, plates]);
  const grouped = groupPlates(breakdown.perSide);

  function togglePlate(plate: number) {
    const next = plates.includes(plate)
      ? plates.filter((p) => p !== plate)
      : [...plates, plate].sort((a, b) => b - a);
    setPlates(next);
    setPlateSet(next);
  }

  function pickBar(kg: number) {
    setBar(kg);
    setBarKg(kg);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="tap-target inline-flex h-11 items-center gap-1 rounded-full bg-surface-3 px-3 text-xs font-semibold text-muted-foreground"
        >
          <Calculator className="size-3.5" strokeWidth={2.6} />
          {t("Plates")}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t("Plate calculator")}</SheetTitle>
          <SheetDescription>{t("How to load the bar for this set.")}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Target")}
            </p>
            <p className="num-big mt-1 text-train">{formatKg(weight)}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                className="tap-target h-11 px-4 font-semibold"
                onClick={() =>
                  setWeight((w) => Math.max(0, fromDisplayWeight(toDisplayWeight(w) - 2.5)))
                }
              >
                −
              </Button>
              <Button
                variant="secondary"
                className="tap-target h-11 px-4 font-semibold"
                onClick={() => setWeight((w) => fromDisplayWeight(toDisplayWeight(w) + 2.5))}
              >
                +
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Per side")}
            </p>
            {grouped.length ? (
              <ul className="flex flex-wrap gap-2">
                {grouped.map(({ plate, count }) => (
                  <li
                    key={plate}
                    className="rounded-xl bg-train/15 px-3 py-2 text-sm font-semibold tabular-nums text-train"
                  >
                    {t("{count}× {weight}", { count, weight: formatKg(plate) })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Empty bar — no plates needed.")}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t("Bar {bar} + plates = {total}", {
                bar: formatKg(breakdown.barKg),
                total: formatKg(breakdown.achievedKg),
              })}
              {breakdown.offKg !== 0
                ? ` · ${t("closest possible with your plates")}`
                : ""}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Bar")}
            </p>
            <div className="flex flex-wrap gap-2">
              {BAR_OPTIONS_KG.map((kg) => (
                <button
                  key={kg}
                  type="button"
                  onClick={() => pickBar(kg)}
                  className={cn(
                    "tap-target rounded-xl border px-3 text-sm font-semibold tabular-nums",
                    kg === bar ? "border-primary bg-primary/15 text-primary" : "border-border",
                  )}
                >
                  {formatKg(kg)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Plates available")}
            </p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PLATES_KG.map((plate) => (
                <button
                  key={plate}
                  type="button"
                  aria-pressed={plates.includes(plate)}
                  onClick={() => togglePlate(plate)}
                  className={cn(
                    "tap-target rounded-xl border px-3 text-sm font-semibold tabular-nums",
                    plates.includes(plate)
                      ? "border-train bg-train/15 text-train"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {formatKg(plate)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
