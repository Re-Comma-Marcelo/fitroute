import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const stopSizes = {
  hairline: "size-1",
  divider: "size-3",
  heavy: "size-7",
  icon: "size-[5px]",
  corner: "size-2.5",
} as const;

export function Stop({
  size = "hairline",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { size?: keyof typeof stopSizes }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 rounded-none bg-oxide", stopSizes[size], className)}
      {...props}
    />
  );
}

export function StoppedRule({
  weight = "divider",
  tone = "ink",
  className,
}: {
  weight?: "hairline" | "divider" | "heavy";
  tone?: "ink" | "violet" | "steel";
  className?: string;
}) {
  const line = weight === "heavy" ? "h-3.5" : weight === "divider" ? "h-1.5" : "h-0.5";
  const color = tone === "violet" ? "bg-violet" : tone === "steel" ? "bg-steel" : "bg-ink";
  return (
    <div className={cn("flex w-full items-center", className)} aria-hidden="true">
      <span className={cn("min-w-0 flex-1", line, color)} />
      <Stop size={weight} />
    </div>
  );
}

export function PanelStop({ className }: { className?: string }) {
  return <Stop size="corner" className={cn("absolute right-0 top-0", className)} />;
}
