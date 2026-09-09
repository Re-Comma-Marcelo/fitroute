import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Thin SVG ring showing how much of the session is logged.
 * Orange while training, green once every set is done.
 */
export function ProgressRing({
 done,
 total,
 size = 34,
 stroke = 3,
 showLabel = true,
 className,
}: {
 done: number;
 total: number;
 size?: number;
 stroke?: number;
 showLabel?: boolean;
 className?: string;
}) {
 const t = useT();
 const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
 const complete = total > 0 && done >= total;
 const r = (size - stroke) / 2;
 const circumference = 2 * Math.PI * r;

 return (
 <span
 className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
 role="img"
 aria-label={t("{done} of {total} sets completed", { done, total })}
 >
 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
 <circle
 cx={size / 2}
 cy={size / 2}
 r={r}
 fill="none"
 stroke="var(--surface-3)"
 strokeWidth={stroke}
 />
 <circle
 cx={size / 2}
 cy={size / 2}
 r={r}
 fill="none"
 stroke={complete ? "var(--success)" : "var(--train)"}
 strokeWidth={stroke}
 strokeLinecap="round"
 strokeDasharray={circumference}
 strokeDashoffset={circumference * (1 - pct / 100)}
 transform={`rotate(-90 ${size / 2} ${size / 2})`}
 className="motion-safe:transition-colors motion-safe:duration-200"
 />
 </svg>
 {showLabel ? (
 <span
 aria-hidden="true"
 className={cn(
 "absolute text-[9px] font-semibold tabular-nums",
 complete ? "text-violet" : "text-steel",
 )}
 >
 {Math.round(pct)}
 </span>
 ) : null}
 </span>
 );
}
