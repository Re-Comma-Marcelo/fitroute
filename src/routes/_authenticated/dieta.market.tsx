import { pageMeta } from "@/lib/route-meta";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Eraser, Plus, Share2, ShoppingBasket, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { undoToast } from "@/lib/undo";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  getCheckedItems,
  getMeals,
  isoDate,
  shoppingListFromMeals,
  toggleCheckedItem,
  weekDates,
} from "@/lib/data/nutrition";
import { getArchivedWeeks, getWeekMenu, removeListItem } from "@/lib/data/week-menu";
import { addEntry, getDayEntries } from "@/lib/data/diet-entries";
import { estimateItemPrice, estimateTotalPrice } from "@/lib/data/prices";
import { WeekMenuSection } from "@/components/diet/WeekMenuSection";
import { MealDetailSheet } from "@/components/MealDetailSheet";
import type { Meal, MealSlot, ShoppingItem } from "@/lib/nutrition-types";
import { QueryError } from "@/components/QueryError";

export const Route = createFileRoute("/_authenticated/dieta/market")({
  head: () => ({
    meta: pageMeta({
      title: "Shopping list",
      description:
        "One weekly shopping list, merged from the meals you picked for the week and grouped by aisle.",
      ogDescription:
        "An aisle-grouped weekly shopping list generated from the meals you chose for this week.",
    }),
  }),
  component: MarketPage,
});

function MarketPage() {
  const t = useT();
  const qc = useQueryClient();
  const [checked, setChecked] = useState<string[]>(() => getCheckedItems());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [detail, setDetail] = useState<{ meal: Meal; slot: MealSlot } | null>(null);

  const dates = useMemo(() => weekDates(), []);
  const menuQ = useQuery({ queryKey: ["weekMenu"], queryFn: getWeekMenu });
  const mealsQ = useQuery({ queryKey: ["meals", "all"], queryFn: () => getMeals() });
  const weekEntriesQ = useQuery({
    queryKey: ["weekEntries", dates.join()],
    queryFn: async () => (await Promise.all(dates.map((d) => getDayEntries(d)))).flat(),
  });

  const menu = menuQ.data;
  const allMeals = mealsQ.data ?? [];
  const selectedMeals = useMemo(
    () => (menu?.mealIds ?? []).flatMap((id) => allMeals.filter((m) => m.id === id)),
    [menu?.mealIds, allMeals],
  );

  const list = useMemo(() => shoppingListFromMeals(selectedMeals), [selectedMeals]);
  const items = useMemo(
    () => list.items.filter((i) => !(menu?.removedKeys ?? []).includes(i.key)),
    [list.items, menu?.removedKeys],
  );

  // getCheckedItems() reads a cache filled during hydration, so the initial
  // state can be empty on a cold reload — re-sync once the meals resolve.
  useEffect(() => {
    if (!mealsQ.isSuccess) return;
    const stored = getCheckedItems();
    setChecked((prev) =>
      prev.length === stored.length && prev.every((k) => stored.includes(k)) ? prev : stored,
    );
  }, [mealsQ.isSuccess, mealsQ.dataUpdatedAt]);

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const arr = map.get(item.aisle) ?? [];
      arr.push(item);
      map.set(item.aisle, arr);
    }
    return [...map.entries()];
  }, [items]);

  const total = items.length;
  const done = items.filter((i) => checked.includes(i.key)).length;
  const estTotal = estimateTotalPrice(items);
  const estLeft = estimateTotalPrice(items.filter((i) => !checked.includes(i.key)));

  const plannedOn = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const e of weekEntriesQ.data ?? []) {
      out[e.mealId] = [...new Set([...(out[e.mealId] ?? []), e.date])].sort();
    }
    return out;
  }, [weekEntriesQ.data]);

  const shareText = useMemo(() => {
    const lines: string[] = [t("Shopping list")];
    for (const [aisle, aisleItems] of groups) {
      lines.push(`\n${aisle}`);
      for (const it of aisleItems) {
        const mark = checked.includes(it.key) ? "✓ " : "";
        lines.push(
          `  ${mark}${it.name} — ${formatNumber(Math.round(it.qty * 10) / 10)} ${it.unit}`,
        );
      }
    }
    if (list.orderOut.length) {
      lines.push(`\n${t("Ordering out")}`);
      for (const o of list.orderOut) lines.push(`  ${o.name}`);
    }
    return lines.join("\n");
  }, [groups, checked, list.orderOut, t]);

  async function shareList() {
    try {
      if (navigator.share) {
        await navigator.share({ title: t("Shopping list"), text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success(t("Shopping list copied to clipboard."));
      }
    } catch {
      // user cancelled share sheet — no toast needed
    }
  }

  function clearChecked() {
    const removed = checked.filter((k) => items.some((i) => i.key === k));
    if (!removed.length) return;
    removed.forEach((key) => toggleCheckedItem(key, () => {}));
    setChecked([]);
    undoToast({
      message: t("Cleared {n} checked items.", { n: removed.length }),
      undoLabel: t("Undo"),
      onUndo: () => {
        removed.forEach((key) => toggleCheckedItem(key, () => {}));
        setChecked(removed);
      },
    });
  }

  async function dropItem(key: string) {
    await removeListItem(key);
    void qc.invalidateQueries({ queryKey: ["weekMenu"] });
  }

  async function assign(meal: Meal, date: string, slot: MealSlot) {
    await addEntry({ date, slot, mealId: meal.id });
    void qc.invalidateQueries({ queryKey: ["weekEntries"] });
    void qc.invalidateQueries({ queryKey: ["dietEntries", date] });
    toast.success(t("Added to your day."));
  }

  const archive = getArchivedWeeks();
  const notStarted = !!menu && !menu.completedAt && !menu.mealIds.length;

  if (menuQ.isError || mealsQ.isError) {
    return (
      <QueryError
        message={t("Could not load your shopping list.")}
        onRetry={() => {
          void menuQ.refetch();
          void mealsQ.refetch();
        }}
      />
    );
  }

  return (
    <>
      {notStarted ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-border p-8 text-center">
          <ShoppingBasket className="size-9 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">{t("New week, empty shopping list")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Pick the meals you feel like eating this week and the app merges every ingredient into one list.",
            )}
          </p>
          <Button asChild className="tap-target mt-4 w-full">
            <Link to="/dieta/interview">{t("Start this week")}</Link>
          </Button>
        </section>
      ) : total === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-border p-8 text-center">
          <ShoppingBasket className="size-9 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">{t("Nothing to buy yet")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("You have not picked any meals for this week yet — choose a few to fill the list.")}
          </p>
          <Button asChild className="tap-target mt-4 w-full">
            <Link to="/dieta/interview">{t("Pick meals for this week")}</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-primary/5 p-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("Estimated cost")}
              </p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(estTotal)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("~{amount} still to buy · rough estimate", { amount: formatCurrency(estLeft) })}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{t("This week")}</p>
              <p className="mt-0.5">{t("{done} of {total} items checked", { done, total })}</p>
            </div>
          </section>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={shareList}
              className="tap-target flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold"
            >
              <Share2 className="size-4" /> {t("Share list")}
            </button>
            <button
              type="button"
              onClick={clearChecked}
              disabled={!done}
              className="tap-target flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold disabled:opacity-40"
            >
              <Eraser className="size-4" /> {t("Clear checked")}
            </button>
          </div>

          <div className="mt-2 space-y-4">
            {groups.map(([aisle, aisleItems]) => (
              <section key={aisle} className="rounded-2xl border border-border bg-card p-3.5">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {aisle}
                </h2>
                <ul className="mt-2 divide-y divide-border/60">
                  {aisleItems.map((item) => {
                    const isChecked = checked.includes(item.key);
                    return (
                      <li key={item.key} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setChecked(
                              toggleCheckedItem(item.key, (revert) => {
                                setChecked(revert);
                                toast.error(t("Could not save the shopping list. Try again."));
                              }),
                            )
                          }
                          className="tap-target flex flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                              isChecked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            }`}
                          >
                            {isChecked ? <Check className="size-3.5" /> : null}
                          </span>
                          <span
                            className={`flex-1 text-sm ${isChecked ? "text-muted-foreground line-through" : ""}`}
                          >
                            {item.name}
                          </span>
                          <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {formatNumber(Math.round(item.qty * 10) / 10)} {item.unit}
                            <span className="block text-[11px] text-muted-foreground/70">
                              ~{formatCurrency(estimateItemPrice(item))}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={t("Remove")}
                          onClick={() => void dropItem(item.key)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {list.orderOut.length ? (
            <section className="mt-4 rounded-2xl border border-border bg-card p-3.5">
              <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Truck className="size-3.5" /> {t("Ordering out")}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {list.orderOut.map((o) => (
                  <li key={o.id} className="flex items-center justify-between text-sm">
                    <span>{o.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {o.kcal} kcal
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <WeekMenuSection
            meals={selectedMeals}
            dates={dates}
            plannedOn={plannedOn}
            onAssign={(meal, date, slot) => void assign(meal, date, slot)}
            onOpen={(meal) => setDetail({ meal, slot: meal.slots[0] ?? "dinner" })}
          />

          <Button asChild variant="outline" className="tap-target mt-3 w-full">
            <Link to="/dieta/interview">
              <Plus className="size-4" /> {t("Pick more meals")}
            </Link>
          </Button>
        </>
      )}

      {archive.length ? (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <h2 className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("Earlier weeks")}
            </h2>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${archiveOpen ? "rotate-180" : ""}`}
            />
          </button>
          {archiveOpen ? (
            <ul className="mt-2 space-y-1.5">
              {archive.map((w) => (
                <li
                  key={w.weekStart}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span>{w.weekStart}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("{n} meals", { n: w.mealIds.length })}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <MealDetailSheet
        meal={detail?.meal ?? null}
        slot={detail?.slot ?? "dinner"}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        targets={{ kcal: 2700, proteinG: 165, carbsG: 300, fatG: 75 }}
        dayTotals={{ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
        weekTotals={{ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }}
        planned={false}
        onToggle={async () => {
          if (!detail) return;
          await assign(detail.meal, isoDate(new Date()), detail.slot);
          setDetail(null);
        }}
      />
    </>
  );
}
