import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/format";
import { hapticTick } from "@/lib/haptics";
import { Timer } from "lucide-react";
import { RPE_VALUES, rpeMeaning, snapRpe } from "@/lib/rpe";
import { cn } from "@/lib/utils";

const MIN = RPE_VALUES[0];
const MAX = RPE_VALUES[RPE_VALUES.length - 1]!;

/** One horizontal line: 6 on the left, 10 on the right. Tap a mark or drag it. */
export function RpeScale({
  value,
  onChange,
  onCommit,
}: {
  value: number | null;
  onChange: (value: number) => void;
  /** Fired once the choice is final: a tap, or the finger lifting after a drag. */
  onCommit?: (value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<number | null>(value);

  function pick(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const next = snapRpe(MIN + ratio * (MAX - MIN));
    if (lastRef.current === next) return;
    lastRef.current = next;
    hapticTick();
    onChange(next);
  }

  const ratio = value === null ? null : (value - MIN) / (MAX - MIN);

  return (
    <div className="select-none">
      <div className="flex items-end justify-center gap-2">
        <span
          className={cn(
            "text-5xl font-bold tabular-nums leading-none",
            value === null ? "text-muted-foreground/40" : "text-info",
          )}
        >
          {value === null ? "–" : value}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="RPE"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value ?? undefined}
        className="relative mt-6 h-12 touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          lastRef.current = null;
          pick(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e.clientX);
        }}
        onPointerUp={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          if (lastRef.current !== null) onCommit?.(lastRef.current);
        }}
        onKeyDown={(e) => {
          const index = value === null ? -1 : RPE_VALUES.indexOf(snapRpe(value));
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(RPE_VALUES[Math.min(RPE_VALUES.length - 1, index + 1)]!);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(RPE_VALUES[Math.max(0, index <= 0 ? 0 : index - 1)]!);
          }
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        {ratio !== null ? (
          <div
            className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-info/70"
            style={{ width: `${ratio * 100}%` }}
          />
        ) : null}
        {RPE_VALUES.map((option, i) => {
          const left = (i / (RPE_VALUES.length - 1)) * 100;
          const active = value === option;
          const whole = Number.isInteger(option);
          return (
            <button
              key={option}
              type="button"
              aria-label={`RPE ${option}`}
              onClick={() => {
                if (value !== option) hapticTick();
                onChange(option);
                onCommit?.(option);
              }}
              className="absolute top-0 flex h-12 w-9 -translate-x-1/2 items-center justify-center"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full border font-semibold tabular-nums transition-all",
                  active
                    ? "h-10 w-10 border-info bg-info text-sm text-info-foreground shadow-lg"
                    : whole
                      ? "h-6 w-6 border-border bg-card text-[10px] text-muted-foreground"
                      : "h-3 w-3 border-border bg-card text-[0px] text-transparent",
                )}
              >
                {active ? option : whole ? option : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{MIN}</span>
        <span>{MAX}</span>
      </div>
    </div>
  );
}

/** Slide-up sheet shown right after a working set is ticked. */
export function RpeSheet({
  open,
  onOpenChange,
  exerciseName,
  setLabel,
  value,
  onSave,
  onSkip,
  restLeft = 0,
  restTotal = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  setLabel: string;
  value: string;
  onSave: (value: string) => void;
  onSkip: () => void;
  /** Rest countdown already running behind the sheet, so it stays visible. */
  restLeft?: number;
  restTotal?: number;
}) {
  const t = useT();
  const [draft, setDraft] = useState<number | null>(value ? Number(value) : null);
  const meaning = rpeMeaning(draft);
  const restPct = restTotal > 0 ? Math.max(0, Math.min(1, restLeft / restTotal)) : 0;

  /** Picking a value only stages it — nothing saves until Confirm is tapped. */
  function confirm() {
    if (draft === null) return;
    onSave(String(draft));
    onOpenChange(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value ? Number(value) : null);
        onOpenChange(next);
      }}
    >
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-3">
            <span>{t("How hard was that set?")}</span>
            {restLeft > 0 ? (
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-info/15 px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-info"
                role="timer"
                aria-label={t("Rest")}
              >
                <span className="relative flex size-4 items-center justify-center">
                  <svg width={16} height={16} className="-rotate-90">
                    <circle
                      cx={8}
                      cy={8}
                      r={6}
                      fill="none"
                      strokeWidth={2}
                      className="stroke-info/25"
                    />
                    <circle
                      cx={8}
                      cy={8}
                      r={6}
                      fill="none"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 6}
                      strokeDashoffset={2 * Math.PI * 6 * (1 - restPct)}
                      className="stroke-info transition-[stroke-dashoffset] duration-1000 ease-linear"
                    />
                  </svg>
                  <Timer className="absolute size-2.5" />
                </span>
                {formatDuration(restLeft)}
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        <p className="mt-1 text-xs text-muted-foreground">
          {exerciseName} · {setLabel}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("Pick a number, then confirm — it sets your next weights.")}
        </p>

        <div className="mt-6">
          <RpeScale value={draft} onChange={setDraft} onCommit={setDraft} />
        </div>

        <p className="mt-5 min-h-10 rounded-xl border border-border bg-card px-3 py-2 text-center text-sm font-medium text-foreground">
          {meaning ? t(meaning) : t("Pick how many reps you had left in the tank.")}
        </p>

        <div className="mt-5 flex gap-2">
          <Button
            variant="ghost"
            className="h-12 flex-1 text-sm font-semibold text-muted-foreground"
            onClick={() => {
              onSkip();
              onOpenChange(false);
            }}
          >
            {t("Skip")}
          </Button>
          <Button
            className="h-12 flex-[2] font-semibold"
            disabled={draft === null}
            onClick={confirm}
          >
            {t("Confirm")}
          </Button>
        </div>
        {value ? (
          <Button
            variant="ghost"
            className="mt-1 h-10 w-full text-xs font-semibold text-muted-foreground"
            onClick={() => {
              onSave("");
              onOpenChange(false);
            }}
          >
            {t("Clear")}
          </Button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
