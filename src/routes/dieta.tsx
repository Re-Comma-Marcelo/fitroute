import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Salad, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNutritionInsight } from "@/lib/coach/nutrition";

export const Route = createFileRoute("/dieta")({
  head: () => ({
    meta: [
      { title: "Nutrition — Forja" },
      {
        name: "description",
        content: "Daily macros and calories summary. Meal logging is coming soon.",
      },
      { property: "og:title", content: "Nutrition — Forja" },
      { property: "og:description", content: "Visual summary of kcal, protein, carbs and fat." },
    ],
  }),
  component: DietPage,
});

const macros = [
  { label: "Protein", current: 132, target: 175, unit: "g", color: "var(--chart-1)" },
  { label: "Carbs", current: 210, target: 300, unit: "g", color: "var(--chart-2)" },
  { label: "Fat", current: 52, target: 70, unit: "g", color: "var(--chart-3)" },
];

function Ring({ pct, color, size = 88 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={8} stroke="var(--muted)" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={8}
        stroke={color}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(1, pct)).toFixed(1)} ${c}`}
      />
    </svg>
  );
}

function DietPage() {
  const kcal = { current: 2180, target: 2700 };
  const insightQuery = useQuery({ queryKey: ["nutritionInsight"], queryFn: getNutritionInsight });
  const insight = insightQuery.data;

  return (
    <AppShell title="Nutrition">
      {insight ? (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">{insight.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-4 flex flex-col items-center rounded-xl border border-border bg-card p-6">
        <div className="relative">
          <Ring pct={kcal.current / kcal.target} color="var(--primary)" size={160} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">{kcal.current}</span>
            <span className="text-xs font-medium text-muted-foreground">of {kcal.target} kcal</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Static example of a maintenance day</p>
      </section>

      <ul className="mt-4 grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <li key={m.label} className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
            <div className="relative">
              <Ring pct={m.current / m.target} color={m.color} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold tabular-nums">{m.current}</span>
                <span className="text-[10px] text-muted-foreground">/{m.target}{m.unit}</span>
              </div>
            </div>
            <span className="mt-2 text-xs font-semibold">{m.label}</span>
          </li>
        ))}
      </ul>

      <section className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border p-8 text-center">
        <Salad className="size-10 text-muted-foreground" />
        <h2 className="mt-3 text-xl font-bold">Coming soon</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Meal logging and automatic macro counting will arrive in the next version.
        </p>
      </section>
    </AppShell>
  );
}
