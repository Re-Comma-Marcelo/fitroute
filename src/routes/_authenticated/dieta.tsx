import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Salad } from "lucide-react";

export const Route = createFileRoute("/dieta")({
  head: () => ({
    meta: [
      { title: "Dieta — Forja" },
      {
        name: "description",
        content: "Resumo de macros e calorias do dia. Registro de alimentação em breve.",
      },
      { property: "og:title", content: "Dieta — Forja" },
      { property: "og:description", content: "Resumo visual de kcal, proteína, carboidrato e gordura." },
    ],
  }),
  component: DietPage,
});

const macros = [
  { label: "Proteína", atual: 132, meta: 175, unidade: "g", cor: "var(--chart-1)" },
  { label: "Carboidrato", atual: 210, meta: 300, unidade: "g", cor: "var(--chart-2)" },
  { label: "Gordura", atual: 52, meta: 70, unidade: "g", cor: "var(--chart-3)" },
];

function Ring({ pct, cor, size = 88 }: { pct: number; cor: string; size?: number }) {
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
        stroke={cor}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(1, pct)).toFixed(1)} ${c}`}
      />
    </svg>
  );
}

function DietPage() {
  const kcal = { atual: 2180, meta: 2700 };
  return (
    <AppShell title="Dieta">
      <section className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
        <div className="relative">
          <Ring pct={kcal.atual / kcal.meta} cor="var(--primary)" size={160} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">{kcal.atual}</span>
            <span className="text-xs font-medium text-muted-foreground">de {kcal.meta} kcal</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Exemplo estático de um dia de manutenção</p>
      </section>

      <ul className="mt-4 grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <li key={m.label} className="flex flex-col items-center rounded-xl border border-border bg-card p-3">
            <div className="relative">
              <Ring pct={m.atual / m.meta} cor={m.cor} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold tabular-nums">{m.atual}</span>
                <span className="text-[10px] text-muted-foreground">/{m.meta}{m.unidade}</span>
              </div>
            </div>
            <span className="mt-2 text-xs font-semibold">{m.label}</span>
          </li>
        ))}
      </ul>

      <section className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border p-8 text-center">
        <Salad className="size-10 text-muted-foreground" />
        <h2 className="mt-3 text-xl font-bold">Em breve</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O registro de refeições e a contagem automática de macros chegam na próxima versão.
        </p>
      </section>
    </AppShell>
  );
}
