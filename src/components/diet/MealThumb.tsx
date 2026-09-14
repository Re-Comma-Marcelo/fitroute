import { Apple, Croissant, Moon, UtensilsCrossed } from "lucide-react";
import type { MealSlot } from "@/lib/nutrition-types";

/**
 * The visual mark of a meal.
 *
 * There used to be four stock photos here, one per eating moment, so every
 * lunch in the app showed the same plate of food. A photo that is not of your
 * food is worse than no photo: it reads as a bug. An icon per moment is
 * honest, weighs nothing and stays legible at 48px.
 */
const BY_SLOT: Record<MealSlot, { Icon: typeof Apple; tint: string }> = {
  breakfast: { Icon: Croissant, tint: "text-train" },
  lunch: { Icon: UtensilsCrossed, tint: "text-diet" },
  snack: { Icon: Apple, tint: "text-chart-3" },
  dinner: { Icon: Moon, tint: "text-primary" },
};

export function MealThumb({
  slot,
  size = "md",
  className = "",
}: {
  slot: MealSlot | undefined;
  /** md is the list row; lg heads a sheet or a card. */
  size?: "md" | "lg";
  className?: string;
}) {
  const { Icon, tint } = BY_SLOT[slot ?? "lunch"];
  const box = size === "lg" ? "size-16 rounded-2xl" : "size-12 rounded-xl";
  const icon = size === "lg" ? "size-7" : "size-5";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border border-border bg-surface-2 ${box} ${className}`}
    >
      <Icon className={`${icon} ${tint}`} />
    </span>
  );
}
