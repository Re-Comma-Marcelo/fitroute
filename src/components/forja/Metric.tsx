import { cn } from "@/lib/utils";

export type MetricSize = 16 | 22 | 28 | 40;
export type MetricColor = "text" | "accent" | "effort" | "recovery" | "label";

const COLOR: Record<MetricColor, string> = {
  text: "text-fj-text",
  accent: "text-fj-accent",
  effort: "text-fj-effort",
  recovery: "text-fj-recovery",
  label: "text-fj-label",
};

/** A number in the metric face (Archivo italic, stretched), with an optional small unit. */
export function Metric({
  value,
  unit,
  size = 22,
  color = "text",
  className,
}: {
  value: string | number;
  unit?: string | undefined;
  size?: MetricSize;
  color?: MetricColor;
  className?: string;
}) {
  return (
    <span
      className={cn("metric inline-flex items-baseline whitespace-nowrap", COLOR[color], className)}
      style={{ fontSize: `var(--metric-${size})` }}
    >
      {value}
      {unit ? (
        <span className="ml-[0.12em]" style={{ fontSize: "calc(1em * var(--unit-ratio))" }}>
          {unit}
        </span>
      ) : null}
    </span>
  );
}
