import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { PlateauFlag } from "@/lib/coach/plateau";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PlateauCoachCard({ flag }: { flag: PlateauFlag }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-train/25 bg-train/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-train/15 text-train">
          <Sparkles className="size-4" />
        </span>
        <span className="flex-1">
          <span className="label-caps text-train/80">{t("Coach")}</span>
          <span className="font-display mt-0.5 block text-base font-semibold leading-tight">
            {flag.insight.title}
          </span>
          <span className="mt-1 block text-sm leading-snug text-muted-foreground">
            {flag.insight.body}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {open ? t("Hide reasoning") : t("See why")}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </span>
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-train/15 px-4 pb-4 pt-3">
          <ul className="space-y-1.5">
            {flag.reasoning.map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-snug text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-train/60" />
                {line}
              </li>
            ))}
          </ul>
          <p className="rounded-xl bg-background/40 p-3 text-sm font-medium leading-snug">
            {flag.action}
          </p>
        </div>
      ) : null}
    </section>
  );
}
