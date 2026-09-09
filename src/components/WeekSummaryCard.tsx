import { CalendarRange } from "lucide-react";
import { useT } from "@/lib/i18n";
import { formatDurationShort, formatKg } from "@/lib/format";
import type { WeekSummary } from "@/lib/week-summary";
import type { WeeklyTargets } from "@/lib/weekly-targets";
import { cn } from "@/lib/utils";

/** Closing read on the current week, with deltas against the previous one. */
export function WeekSummaryCard({
  summary,
  targets,
}: {
  summary: WeekSummary;
  targets: WeeklyTargets;
}) {
  const t = useT();
  const { current, previous } = summary;
  if (!current.sessions && !previous.sessions) return null;

  const highlight = buildHighlight(t, summary);

  return (
    <section className="mt-4 rounded-lg border border-border bg-card p-4">
      <h2 className="label-caps flex items-center gap-1.5">
        <CalendarRange className="size-3.5 text-primary" /> {t("Your week")}
      </h2>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Cell
          label={t("Volume")}
          value={formatKg(current.volume)}
          delta={current.volume - previous.volume}
          format={(v) => formatKg(Math.abs(v))}
        />
        <Cell
          label={t("Working sets")}
          value={String(current.sets)}
          delta={current.sets - previous.sets}
          format={(v) => String(Math.abs(v))}
        />
        <Cell
          label={t("Sessions")}
          value={String(current.sessions)}
          delta={current.sessions - previous.sessions}
          format={(v) => String(Math.abs(v))}
        />
      </dl>

      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {current.rpe > 0 ? <li>{t("{val} avg RPE", { val: current.rpe })}</li> : null}
        {current.tempoSeg > 0 ? (
          <li>{t("{time} under tension", { time: formatDurationShort(current.tempoSeg) })}</li>
        ) : null}
        {current.grupos.length ? (
          <li className="capitalize">
            {t("Trained: {groups}", { groups: current.grupos.slice(0, 4).join(", ") })}
          </li>
        ) : null}
        {targets.volumeKg > 0 ? (
          <li className="tabular-nums">
            {t("Volume target {pct}%", {
              pct: Math.round((current.volume / targets.volumeKg) * 100),
            })}
          </li>
        ) : null}
        {targets.sets > 0 ? (
          <li className="tabular-nums">
            {t("Sets target {pct}%", {
              pct: Math.round((current.sets / targets.sets) * 100),
            })}
          </li>
        ) : null}
      </ul>

      <p className="mt-3 rounded-lg bg-background/40 p-3 text-sm font-medium leading-snug">
        {highlight}
      </p>
    </section>
  );
}

function buildHighlight(
  t: (s: string, v?: Record<string, string | number>) => string,
  summary: WeekSummary,
): string {
  const { current, previous } = summary;
  if (!previous.sessions) return t("First week logged — this becomes your baseline.");
  const diff = current.volume - previous.volume;
  const pct = previous.volume > 0 ? Math.round((diff / previous.volume) * 100) : 0;
  if (current.rpe > 0 && previous.rpe > 0 && current.rpe - previous.rpe >= 1 && diff <= 0) {
    return t("Effort is up while volume is flat — a lighter week would help.");
  }
  if (pct >= 10) return t("Volume up {pct}% on last week — keep loads honest.", { pct });
  if (pct <= -10)
    return t("Volume down {pct}% on last week — add a set where it matters.", {
      pct: Math.abs(pct),
    });
  return t("Volume held steady — a good week to push one lift.");
}

function Cell({
  label,
  value,
  delta,
  format,
}: {
  label: string;
  value: string;
  delta: number;
  format: (value: number) => string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <dt className="label-caps">{label}</dt>
      <dd className="font-display mt-1 whitespace-nowrap text-base font-semibold tabular-nums">
        {value}
      </dd>
      <dd
        className={cn(
          "mt-0.5 text-[11px] font-semibold tabular-nums",
          delta > 0 && "text-violet",
          delta < 0 && "text-oxide",
          delta === 0 && "text-muted-foreground",
        )}
      >
        {delta > 0 ? "+" : delta < 0 ? "−" : "="} {format(delta)}
      </dd>
    </div>
  );
}
