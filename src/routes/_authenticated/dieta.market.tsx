import { pageMeta } from "@/lib/route-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ShoppingBasket, Truck } from "lucide-react";
import { formatCurrency, formatWeekdayShort } from "@/lib/format";
import { useT } from "@/lib/i18n";
import {
  SLOT_LABEL,
  getCheckedItems,
  getShoppingList,
  isoDate,
  toggleCheckedItem,
} from "@/lib/data/nutrition";
import { estimateItemPrice, estimateTotalPrice } from "@/lib/data/prices";
import type { ShoppingItem } from "@/lib/nutrition-types";

export const Route = createFileRoute("/_authenticated/dieta/market")({
  head: () => ({
    meta: pageMeta({
      title: "Shopping list",
      description:
        "Ingredients from your planned meals, merged and grouped by aisle so shopping takes one trip.",
      ogDescription:
        "An aisle-grouped shopping list generated from the meals you planned this week.",
    }),
  }),
  component: MarketPage,
});

function MarketPage() {
  const t = useT();
  const ranges = useMemo(
    () =>
      [
        { id: "3", label: t("Next 3 days") },
        { id: "7", label: t("Next 7 days") },
      ] as const,
    [t],
  );

  const [range, setRange] = useState<"3" | "7">("3");
  const [checked, setChecked] = useState<string[]>(() => getCheckedItems());

  // Both ranges roll forward from today so the shorter one is always a subset.
  const dates = useMemo(() => {
    const length = range === "7" ? 7 : 3;
    return Array.from({ length }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return isoDate(d);
    });
  }, [range]);

  const listQ = useQuery({
    queryKey: ["shoppingList", dates.join()],
    queryFn: () => getShoppingList(dates),
  });

  // getCheckedItems() reads a cache filled during hydration, so the initial
  // state can be empty on a cold reload — re-sync once the list resolves.
  useEffect(() => {
    if (!listQ.isSuccess) return;
    const stored = getCheckedItems();
    setChecked((prev) =>
      prev.length === stored.length && prev.every((k) => stored.includes(k)) ? prev : stored,
    );
  }, [listQ.isSuccess, listQ.dataUpdatedAt]);

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of listQ.data?.items ?? []) {
      const arr = map.get(item.aisle) ?? [];
      arr.push(item);
      map.set(item.aisle, arr);
    }
    return [...map.entries()];
  }, [listQ.data]);

  const items = listQ.data?.items ?? [];
  const total = items.length;
  const done = items.filter((i) => checked.includes(i.key)).length;
  const estTotal = estimateTotalPrice(items);
  const estLeft = estimateTotalPrice(items.filter((i) => !checked.includes(i.key)));

  return (
    <>
      <nav className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
        {ranges.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`tap-target rounded-lg text-xs font-semibold transition-colors ${
              r.id === range ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </nav>

      {total === 0 ? (
        <section className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border p-8 text-center">
          <ShoppingBasket className="size-9 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">{t("Nothing to buy yet")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Plan meals in the Week tab and the ingredients show up here, merged by aisle.")}
          </p>
        </section>
      ) : (
        <>
          <section className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-primary/5 p-3.5">
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
              <p>{t("{days} days covered", { days: dates.length })}</p>
              <p className="mt-0.5">{t("{done} of {total} items checked", { done, total })}</p>
            </div>
          </section>
          <div className="mt-2 space-y-4">
            {groups.map(([aisle, items]) => (
              <section key={aisle} className="rounded-2xl border border-border bg-card p-3.5">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {aisle}
                </h2>
                <ul className="mt-2 divide-y divide-border/60">
                  {items.map((item) => {
                    const isChecked = checked.includes(item.key);
                    return (
                      <li key={item.key}>
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
                          className="tap-target flex w-full items-center gap-3 text-left"
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
                            {Math.round(item.qty * 10) / 10} {item.unit}
                            <span className="block text-[11px] text-muted-foreground/70">
                              ~{formatCurrency(estimateItemPrice(item))}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {listQ.data?.orderOut.length ? (
        <section className="mt-4 rounded-2xl border border-border bg-card p-3.5">
          <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Truck className="size-3.5" /> {t("Ordering out")}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {listQ.data.orderOut.map((o) => (
              <li key={`${o.date}-${o.slot}`} className="flex items-center justify-between text-sm">
                <span>{o.meal.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatWeekdayShort(`${o.date}T12:00:00`)} · {t(SLOT_LABEL[o.slot])}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
