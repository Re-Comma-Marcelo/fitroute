import { useState } from "react";
import { useT } from "@/lib/i18n";
import { ChevronDown, Repeat2, Sparkles, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoachIssueForm } from "@/components/CoachIssueForm";
import type { TodayCardModel } from "@/lib/coach/today-card";
import type { Exercise } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TodayCoachCard({
  model,
  swapOptions,
  swaps,
  onSwap,
  onStart,
  onNoteSaved,
  busy,
}: {
  model: TodayCardModel;
  /** exerciseId -> alternatives for the flagged exercises. */
  swapOptions: Record<string, Exercise[]>;
  swaps: Record<string, string>;
  onSwap: (originalId: string, replacementId: string) => void;
  onStart: (opts: { deload?: boolean }) => void;
  onNoteSaved: () => void;
  busy: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const preview = previewText(model);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="label-caps block text-primary/80">
            {model.isSwitch ? t("Your pick") : t("Coach · today")}
          </span>
          <span className="mt-1 block text-sm leading-snug text-foreground">{model.line}</span>
          {!open ? (
            <span className="mt-2 block">
              {preview ? (
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {preview}{" "}
                  <span className="font-semibold text-primary/80">{t("See why")}</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-primary/80">{t("See why this session")}</span>
              )}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-primary/15 px-4 pb-4 pt-4">
          {model.why.length ? (
            <Block title={t("Why today")}>
              {model.why.map((t) => (
                <Bullet key={t}>{t}</Bullet>
              ))}
            </Block>
          ) : null}

          {model.setup.length ? (
            <Block title={t("Your setup")}>
              {model.setup.map((t) => (
                <Bullet key={t}>{t}</Bullet>
              ))}
            </Block>
          ) : null}

          {model.cautions.length ? (
            <Block title={t("What you told me")}>
              {model.cautions.map((t) => (
                <Bullet key={t} tone="warn">
                  {t}
                </Bullet>
              ))}
            </Block>
          ) : null}

          <div className="space-y-2">
            <Button
              className="h-12 w-full font-bold"
              disabled={busy || !model.routineId}
              onClick={() => onStart({})}
            >
              {t("Keep this plan")}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 font-semibold"
                disabled={busy || !model.routineId}
                onClick={() => onStart({ deload: true })}
              >
                <TrendingDown className="mr-1.5 size-4" /> {t("Lighter session")}
              </Button>
              <Button
                variant="outline"
                className="h-11 font-semibold"
                disabled={model.flagged.length === 0}
                onClick={() => setSwapFor(model.flagged[0]?.exerciseId ?? null)}
              >
                <Repeat2 className="mr-1.5 size-4" /> {t("Swap exercise")}
              </Button>
            </div>
          </div>

          {swapFor ? (
            <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
              <div className="flex flex-wrap gap-1.5">
                {model.flagged.map((f) => (
                  <button
                    key={f.exerciseId}
                    type="button"
                    onClick={() => setSwapFor(f.exerciseId)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                      swapFor === f.exerciseId
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {f.nome}
                  </button>
                ))}
              </div>
              {(swapOptions[swapFor] ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("No alternative on file that fits your equipment and avoid list.")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(swapOptions[swapFor] ?? []).map((alt) => (
                    <li key={alt.id}>
                      <button
                        type="button"
                        onClick={() => onSwap(swapFor, alt.id)}
                        className={cn(
                          "tap-target flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                          swaps[swapFor] === alt.id
                            ? "border-primary text-primary"
                            : "border-border text-foreground",
                        )}
                      >
                        <span className="font-semibold">{alt.nome}</span>
                        <span className="text-xs text-muted-foreground">{alt.equipamento}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t("Applies to today's session only — the routine stays as it is.")}
              </p>
            </div>
          ) : null}

          <CoachIssueForm onSaved={onNoteSaved} />
        </div>
      ) : null}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="label-caps mb-2">{title}</h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Bullet({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <li className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone === "warn" ? "bg-warn" : "bg-primary/60")} />
      <span>{children}</span>
    </li>
  );
}

function previewText(model: TodayCardModel, maxSentences = 3): string {
  const all = [...model.why, ...model.setup, ...model.cautions].join(" ").trim();
  if (!all) return "";
  const sentences = all.match(/[^.!?]+[.!?]+/g) ?? [all];
  const slice = sentences.slice(0, maxSentences).join(" ").trim();
  return slice.length < all.length ? `${slice.replace(/\.$/, "")}…` : slice;
}
