import { Link } from "@tanstack/react-router";
import { ChevronRight, ShoppingBasket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWeekMenu } from "@/lib/data/week-menu";
import { useFeature } from "@/lib/features";
import { useT } from "@/lib/i18n";

/**
 * One line that only shows while this week's meal choice is still open.
 * Tapping it opens the short interview that builds the shopping list.
 */
export function WeekMenuPrompt() {
  const t = useT();
  const weeklyMenu = useFeature("weeklyMenu");
  const menuQ = useQuery({
    queryKey: ["weekMenu"],
    queryFn: getWeekMenu,
    enabled: weeklyMenu,
  });
  const menu = menuQ.data;
  if (!weeklyMenu || !menu || menu.completedAt || menu.mealIds.length) return null;

  return (
    <Link
      to="/dieta/interview"
      className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3.5"
    >
      <ShoppingBasket className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{t("New week, empty shopping list")}</span>
        <span className="block text-xs text-muted-foreground">
          {t("Pick what you feel like eating and the list writes itself.")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
