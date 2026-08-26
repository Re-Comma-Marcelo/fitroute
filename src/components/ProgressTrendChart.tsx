import { useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis } from "recharts";
import type { WeekPoint } from "@/lib/progress-analytics";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "volume" | "sessions";

export function ProgressTrendChart({ data }: { data: WeekPoint[] }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("volume");
  const hasData = data.some((d) => d.volume > 0 || d.sessions > 0);

  const latest = data[data.length - 1];
  const headline =
    mode === "volume"
      ? t("{val}t this week", { val: Math.round((latest?.volume ?? 0) / 1000) })
      : t("{count} sessions this week", { count: latest?.sessions ?? 0 });

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="label-caps">{t("Last 8 weeks")}</h2>
          <p className="font-display mt-0.5 text-base font-semibold tabular-nums">{headline}</p>
        </div>
        <div className="flex rounded-full border border-border p-0.5">
          {(["volume", "sessions"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t(m)}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-3 h-32">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {mode === "volume" ? (
              <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Bar
                  dataKey="volume"
                  className="fill-primary"
                  radius={[4, 4, 2, 2]}
                  maxBarSize={22}
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  className="stroke-primary"
                  strokeWidth={2}
                  dot={{ r: 2.5, className: "fill-primary stroke-primary" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t("Log a few sessions to see your trend here.")}
          </p>
        )}
      </div>
    </section>
  );
}
