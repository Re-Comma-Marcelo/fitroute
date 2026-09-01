import { useT } from "@/lib/i18n";
import { formatKg } from "@/lib/format";
import type { MuscleVolumeRow } from "@/lib/muscle-volume";
import { cn } from "@/lib/utils";

/** Where the week's load went, per primary muscle group, vs last week. */
export function MuscleVolumeCard({ rows }: { rows: MuscleVolumeRow[] }) {
  const t = useT();
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => Math.max(r.current, r.previous)), 1);

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="label-caps">{t("Volume by muscle group")}</h2>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {t("This week compared with last week.")}
      </p>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const delta = row.current - row.previous;
          return (
            <li key={row.grupo}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold capitalize">{row.grupo}</p>
                <p className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {formatKg(row.current)}
                  {row.previous > 0 ? (
                    <span
                      className={cn(
                        "ml-2",
                        delta > 0 && "text-emerald-400",
                        delta < 0 && "text-destructive",
                      )}
                    >
                      {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                      {formatKg(Math.abs(delta))}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-train"
                    style={{ width: `${Math.max(2, (row.current / max) * 100)}%` }}
                  />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40"
                    style={{ width: `${Math.max(1, (row.previous / max) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
