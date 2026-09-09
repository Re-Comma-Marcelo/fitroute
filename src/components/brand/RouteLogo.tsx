import { cn } from "@/lib/utils";
import { Stop } from "./Stop";

function RouteLine({ onInk = false, className }: { onInk?: boolean; className?: string }) {
  return (
    <span className={cn("relative block h-6 w-24", className)} aria-hidden="true">
      <svg viewBox="0 0 96 24" className="size-full overflow-visible">
        <path
          d="M1 19H25V6H54V17H91"
          fill="none"
          stroke={onInk ? "var(--violet-light)" : "var(--violet)"}
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      <Stop
        size="divider"
        className={cn("absolute -right-1 top-[11px]", onInk && "bg-oxide-light")}
      />
    </span>
  );
}

export function RouteLogo({
  variant = "stacked",
  className,
}: {
  variant?: "stacked" | "horizontal" | "icon" | "full-stop" | "masthead";
  className?: string;
}) {
  if (variant === "icon") {
    return (
      <span
        className={cn("grid size-12 place-items-center rounded-lg bg-ink", className)}
        aria-label="ROUTE"
      >
        <RouteLine onInk className="w-8 scale-75" />
      </span>
    );
  }
  if (variant === "full-stop") {
    return (
      <span
        className={cn(
          "inline-flex items-end gap-1 font-display text-xl font-extrabold uppercase",
          className,
        )}
      >
        ROUTE
        <Stop size="corner" className="mb-1" />
      </span>
    );
  }
  if (variant === "horizontal") {
    return (
      <span className={cn("inline-flex items-center gap-3", className)}>
        <RouteLine className="w-14" />
        <span className="font-display text-xl font-extrabold uppercase">ROUTE</span>
      </span>
    );
  }
  if (variant === "masthead") {
    return (
      <span className={cn("block", className)}>
        <span className="font-display text-title font-extrabold uppercase">ROUTE</span>
        <span className="mt-2 flex items-center">
          <span className="h-3.5 flex-1 bg-violet" />
          <Stop size="heavy" />
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <RouteLine />
      <span className="mt-2 font-display text-title font-extrabold uppercase">ROUTE</span>
    </span>
  );
}
