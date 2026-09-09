import { useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis } from "recharts";
import type { WeekPoint } from "@/lib/progress-analytics";
import { formatDurationShort } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "volume" | "sessions" | "rpe" | "time";

export function ProgressTrendChart({ data }: { data: WeekPoint[] }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("volume");
  const hasData = data.some((d) => d.volume > 0 || d.sessions > 0 || d.tempoSeg > 0);
  const hasTempo = data.some((d) => d.tempoSeg > 0);

  const latest = data[data.length - 1];
  const rated = data.filter((d) => d.rpe > 0);
  const headline =
    mode === "volume"
      ? t("{val}t this week", { val: Math.round((latest?.volume ?? 0) / 1000) })
      : mode === "sessions"
        ? t("{count} sessions this week", { count: latest?.sessions ?? 0 })
        : mode === "time"
          ? t("{time} under tension", { time: formatDurationShort(latest?.tempoSeg ?? 0) })
          : rated.length
            ? t("{val} avg RPE", { val: rated[rated.length - 1]!.rpe })
            : t("No RPE logged yet");

  const modes: Mode[] = hasTempo
    ? ["volume", "sessions", "rpe", "time"]
    : ["volume", "sessions", "rpe"];

  return (
    <section className="mt-4 rounded-lg bg-card p-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="label-caps">{t("Last 8 weeks")}</h2>
          <p className="font-display mt-0.5 text-base font-semibold tabular-nums">{headline}</p>
        </div>
        <div className="flex border-b-[3px] border-stone-line">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "border-b-[6px] border-transparent px-3 py-2 text-xs font-bold uppercase transition-colors",
                mode === m ? "border-violet text-violet" : "text-muted-foreground",
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
            {mode === "volume" || mode === "time" ? (
              <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Bar
                  dataKey={mode === "time" ? "tempoSeg" : "volume"}
                  className="fill-steel"
                  radius={0}
                  maxBarSize={22}
                />
              </BarChart>
            ) : (
              <LineChart
                data={mode === "rpe" ? data.filter((d) => d.rpe > 0) : data}
                margin={{ top: 8, right: 6, bottom: 0, left: 6 }}
              >
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Line
                  type="linear"
                  dataKey={mode === "rpe" ? "rpe" : "sessions"}
                  className="stroke-steel"
                  strokeWidth={2}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  dot={(props) => {
                    const index = Number(props.index ?? -1);
                    const count = mode === "rpe" ? data.filter((d) => d.rpe > 0).length : data.length;
                    if (index !== count - 1) return <g />;
                    const cx = Number(props.cx ?? 0);
                    const cy = Number(props.cy ?? 0);
                    return <rect x={cx - 2} y={cy - 2} width={4} height={4} className="fill-oxide" />;
                  }}
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
