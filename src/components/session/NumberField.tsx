import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useValueScrub, type ScrubOptions } from "@/lib/use-value-scrub";
import { cn } from "@/lib/utils";
import { focusNextField } from "@/lib/set-input";

/**
 * Numeric field built for the thumb: hold it and slide up or down and the value
 * moves in steps that grow with the distance travelled, so heavy lifts get there
 * in one gesture. A plain tap still opens the keyboard for typing, and arrow
 * keys do the same job for keyboard users.
 */
export function NumberField({
  value,
  onChange,
  onBlur,
  onFocus,
  inputMode,
  placeholder,
  ariaLabel,
  onStep,
  scrub: scrubOptions,
  size = "md",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  inputMode: "decimal" | "numeric";
  placeholder: string;
  ariaLabel: string;
  onStep?: (direction: 1 | -1, big: boolean) => void;
  scrub?: ScrubOptions;
  /** "lg" is the current-set field: tall and loud. */
  size?: "md" | "lg";
  className?: string;
}) {
  const t = useT();
  const scrub = useValueScrub(scrubOptions);
  return (
    <div className={cn("relative min-w-0", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...(onBlur ? { onBlur } : {})}
        inputMode={inputMode}
        enterKeyHint="next"
        onKeyDown={(e) => {
          if (onStep && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            onStep(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
            return;
          }
          focusNextField(e);
        }}
        placeholder={placeholder}
        aria-label={scrubOptions ? `${ariaLabel} — ${t("hold and slide to adjust")}` : ariaLabel}
        {...scrub.handlers}
        onFocus={(e) => {
          onFocus?.();
          // Select-all: typing overwrites instead of appending to the old number.
          requestAnimationFrame(() => e.target.select());
        }}
        className={cn(
          "numeric-field min-w-0 px-0.5 text-center",
          size === "lg"
            ? "h-14 border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
            : "h-10 text-[15px]",
          scrubOptions && "touch-none",
          scrub.scrubbing && "scale-105 text-primary motion-reduce:scale-100",
          scrub.scrubbing && size === "md" && "border-primary",
        )}
      />
      {scrub.scrubbing ? (
        <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-primary-foreground">
          {scrub.valueLabel}
          <span className="ml-1 font-semibold opacity-80">{scrub.stepLabel}</span>
        </span>
      ) : null}
    </div>
  );
}
