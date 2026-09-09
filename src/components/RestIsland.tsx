import { Check, Timer, TimerOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { REST_PRESETS } from "@/lib/rest-defaults";

/**
 * Rest countdown: circular progress + big tabular timer + -15s / +15s / skip.
 * Shared by the session screen and the mini-player so the countdown looks and
 * behaves the same everywhere.
 *
 * When `presets` is enabled a second row offers one-tap lengths (60/90/120/180)
 * and "save as default for this exercise", so the length can be shaped with a
 * thumb mid-set instead of buried in the exercise settings.
 *
 * When `overdue` is greater than zero the rest window is already over and the
 * bar switches to counting up ("+1:20"), so a phone left on the bench still
 * shows how long the set has been waiting.
 */
export function RestIsland({
 total,
 left,
 overdue = 0,
 label,
 onAdd,
 onSubtract,
 onSkip,
 onOpenSettings,
 onPreset,
 onSaveDefault,
 className,
}: {
 total: number;
 left: number;
 overdue?: number;
 /** Exercise this rest belongs to. */
 label?: string | undefined;
 onAdd: () => void;
 onSubtract: () => void;
 onSkip: () => void;
 onOpenSettings?: () => void;
 onPreset?: (segundos: number) => void;
 onSaveDefault?: () => void;
 className?: string;
}) {
 const t = useT();
 const isOverdue = left <= 0 && overdue > 0;
 const pct = isOverdue ? 0 : total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
 const isLow = isOverdue || left <= 10;
 const size = 40;
 const stroke = 3.5;
 const r = (size - stroke) / 2;
 const circ = 2 * Math.PI * r;
 const showPresets = !isOverdue && !!onPreset;

 return (
 <div
 className={cn(
 "pointer-events-auto mx-auto max-w-md rounded-lg border px-2 py-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
 isLow ? "border-warn/40 bg-warn/10" : "border-info/30 bg-card/95",
 className,
 )}
 >
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={onOpenSettings}
 disabled={!onOpenSettings}
 aria-label={t("Rest")}
 className="flex min-w-0 shrink items-center gap-2 rounded-sm pl-0.5 pr-1 disabled:cursor-default"
 >
 <span className="relative flex shrink-0 items-center justify-center">
 <svg width={size} height={size} className="-rotate-90">
 <circle
 cx={size / 2}
 cy={size / 2}
 r={r}
 fill="none"
 strokeWidth={stroke}
 className="stroke-surface-3"
 />
 <circle
 cx={size / 2}
 cy={size / 2}
 r={r}
 fill="none"
 strokeWidth={stroke}
 strokeLinecap="square"
 strokeDasharray={circ}
 strokeDashoffset={circ * (1 - pct)}
 className={cn(
 "transition-[stroke-dashoffset] duration-1000 ease-linear",
 isLow ? "stroke-warn" : "stroke-info",
 )}
 />
 </svg>
 {isOverdue ? (
 <TimerOff className="absolute size-4 text-warn" />
 ) : (
 <Timer
 className={cn(
 "absolute size-4",
 isLow ? "text-warn motion-safe:" : "text-info",
 )}
 />
 )}
 </span>
 <span className="flex min-w-0 flex-col items-start leading-none">
 <span
 role="timer"
 aria-live="off"
 className={cn(
 "font-mono text-2xl font-semibold tabular-nums leading-none",
 isLow ? "text-warn" : "text-info",
 )}
 >
 {isOverdue ? `+${formatDuration(overdue)}` : formatDuration(left)}
 </span>
 {isOverdue ? (
 <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn/80">
 {t("Rest overdue")}
 </span>
 ) : label ? (
 <span className="mt-0.5 max-w-[9rem] truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
 {label}
 </span>
 ) : null}
 </span>
 </button>

 <span className="ml-auto flex shrink-0 items-center gap-1">
 {isOverdue ? null : (
 <>
 <button
 type="button"
 onClick={onSubtract}
 aria-label={t("Subtract 15 seconds")}
 className="tap-target flex h-11 min-w-11 items-center justify-center rounded-sm bg-surface-3 px-3 text-xs font-semibold tabular-nums"
 >
 −15
 </button>
 <button
 type="button"
 onClick={onAdd}
 aria-label={t("Add 15 seconds")}
 className="tap-target flex h-11 min-w-11 items-center justify-center rounded-sm bg-surface-3 px-3 text-xs font-semibold tabular-nums"
 >
 +15
 </button>
 </>
 )}
 <button
 type="button"
 onClick={onSkip}
 aria-label={isOverdue ? t("Dismiss") : t("Skip rest")}
 className={cn(
 "tap-target flex size-11 items-center justify-center rounded-sm",
 isOverdue ? "bg-warn/20 text-warn" : "bg-info text-info-foreground",
 )}
 >
 <X className="size-5" />
 </button>
 </span>
 </div>

 {showPresets ? (
 <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5">
 {REST_PRESETS.map((segundos) => (
 <button
 key={segundos}
 type="button"
 onClick={() => onPreset?.(segundos)}
 className={cn(
 "flex h-9 shrink-0 items-center justify-center rounded-sm px-3 text-xs font-semibold tabular-nums",
 total === segundos
 ? "bg-info text-info-foreground"
 : "bg-surface-3 text-muted-foreground",
 )}
 >
 {segundos}s
 </button>
 ))}
 {onSaveDefault ? (
 <button
 type="button"
 onClick={onSaveDefault}
 className="ml-auto flex h-9 shrink-0 items-center gap-1 rounded-sm border border-border px-3 text-xs font-semibold"
 >
 <Check className="size-3.5" /> {t("Save as default")}
 </button>
 ) : null}
 </div>
 ) : null}
 </div>
 );
}
