import { Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { CoachInsight } from "@/lib/coach/types";

/** Same "the coach speaks" treatment used elsewhere in the app. */
export function CoachUpdateCard({ insight }: { insight: CoachInsight }) {
  const t = useT();
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {t("Your coach")}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold">{insight.title}</h2>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{insight.body}</p>
        </div>
      </div>
    </section>
  );
}
