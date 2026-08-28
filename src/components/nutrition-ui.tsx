import { mealImage } from "@/lib/meal-image";
import type { Meal, MealSlot, NutritionTargets } from "@/lib/nutrition-types";
import { Check, Clock, Info, Truck } from "lucide-react";
import { useT } from "@/lib/i18n";

export function Ring({
  pct,
  color,
  size = 88,
  width = 8,
}: {
  pct: number;
  color: string;
  size?: number;
  width?: number;
}) {
  const r = size / 2 - width / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={width} stroke="var(--surface-3)" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={width}
        stroke={color}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(1, Math.max(0, pct))).toFixed(1)} ${c}`}
      />
    </svg>
  );
}

export function MacroRings({
  totals,
  targets,
}: {
  totals: NutritionTargets;
  targets: NutritionTargets;
}) {
  const t = useT();
  const macros = [
    { label: t("Protein"), current: totals.proteinG, target: targets.proteinG, color: "var(--diet)" },
    { label: t("Carbs"), current: totals.carbsG, target: targets.carbsG, color: "var(--chart-2)" },
    { label: t("Fat"), current: totals.fatG, target: targets.fatG, color: "var(--chart-3)" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <Ring pct={totals.kcal / Math.max(1, targets.kcal)} color="var(--diet)" size={120} width={9} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums">{totals.kcal}</span>
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
              {t("of {kcal} kcal", { kcal: targets.kcal })}
            </span>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5">
          {macros.map((m) => (
            <li key={m.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{m.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {m.current}/{m.target}g
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (m.current / Math.max(1, m.target)) * 100)}%`,
                    background: m.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MealCard({
  meal,
  slot,
  selected,
  note,
  onSelect,
  onDetails,
}: {
  meal: Meal;
  slot: MealSlot;
  selected?: boolean;
  note?: string | undefined;
  onSelect?: () => void;
  onDetails?: () => void;
}) {
  const t = useT();
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border bg-card text-left transition-colors ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
      <div className="relative h-32 w-full overflow-hidden">
        <img
          src={mealImage(slot)}
          alt={meal.name}
          loading="lazy"
          width={768}
          height={512}
          className="h-full w-full object-cover brightness-110"
        />
        {selected ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
            <Check className="size-3" /> {t("Planned")}
          </span>
        ) : null}
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug">{meal.name}</h3>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {meal.kcal} kcal
          </span>
        </div>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {t("P")} {meal.proteinG}g · {t("C")} {meal.carbsG}g · {t("F")} {meal.fatG}g
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {meal.orderOut ? (
            <Tag icon={<Truck className="size-3" />}>{t("Order out")}</Tag>
          ) : (
            <Tag icon={<Clock className="size-3" />}>{t("{prepMin} min", { prepMin: meal.prepMin })}</Tag>
          )}
          {meal.tags
            .filter((t_tag) => t_tag !== "order-out")
            .map((t_tag) => (
              <Tag key={t_tag}>{t(t_tag.replace("-", " "))}</Tag>
            ))}
        </div>
        {note ? <p className="mt-2.5 text-xs text-primary">{note}</p> : null}
        </div>
      </button>
      {onDetails ? (
        <div className="border-t border-border px-3.5">
          <button
            type="button"
            onClick={onDetails}
            className="tap-target flex w-full items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Info className="size-3.5" /> {t("Macros & nutrition details")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}
