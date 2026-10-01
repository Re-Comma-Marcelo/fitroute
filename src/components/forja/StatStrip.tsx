import { Metric, type MetricColor } from "./Metric";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: string | number;
  unit?: string | undefined;
  color?: MetricColor;
}

/** One glass strip, 3–4 equal columns split by hairlines: a metric over a mono label. */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn("glass grid rounded-strip text-fj-text", className)}
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((s, i) => (
        <div key={s.label} className="relative flex min-w-0 flex-col gap-1.5 px-list py-list">
          {i > 0 ? (
            <span aria-hidden className="absolute bottom-3 left-0 top-3 w-px bg-fj-strip-line" />
          ) : null}
          <Metric value={s.value} unit={s.unit} size={22} color={s.color ?? "text"} />
          <span className="mono-label truncate">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
