import { useState, type ReactNode } from "react";
import { PillButton } from "./PillButton";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Anything Ro (the coach) says. One sentence up front; the full reasoning
 * stays behind "See why".
 */
export function CoachCard({
  text,
  label,
  action,
  why,
  link,
  className,
}: {
  text: ReactNode;
  /** Defaults to "RO · COACH". */
  label?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean } | undefined;
  /** Full reasoning, expanded in place by "See why". */
  why?: ReactNode;
  /** Extra text link next to "See why" (e.g. "Reply"). */
  link?: { label: string; onClick: () => void } | undefined;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <section className={cn("coach-surface rounded-card p-card text-fj-text", className)}>
      <p className="mono-label flex items-center gap-2">
        <span aria-hidden className="size-1.5 rounded-full bg-fj-accent" />
        {label ?? t("Ro · Coach")}
      </p>
      <p className="mt-2 text-coach leading-[1.4]">{text}</p>

      {why || link ? (
        <div className="mt-2 flex gap-4">
          {why ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-meta font-medium text-fj-accent"
            >
              {open ? t("Hide") : t("See why")}
            </button>
          ) : null}
          {link ? (
            <button
              type="button"
              onClick={link.onClick}
              className="text-meta font-medium text-fj-accent"
            >
              {link.label}
            </button>
          ) : null}
        </div>
      ) : null}
      {open && why ? (
        <div className="mt-3 text-body leading-[1.4] text-fj-text-2">{why}</div>
      ) : null}

      {action ? (
        <div className="mt-card flex gap-2">
          <PillButton className="flex-1" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </PillButton>
        </div>
      ) : null}
    </section>
  );
}
