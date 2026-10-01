import { forwardRef, type HTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/** Frosted surface used for every block on Home and Train. */
export const GlassCard = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    /** "card" = 16px, "list" = 14px, "none" for custom layouts. */
    padding?: "card" | "list" | "none";
    asChild?: boolean;
  }
>(function GlassCard({ padding = "card", asChild, className, ...props }, ref) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      className={cn(
        "glass block rounded-card text-fj-text",
        padding === "card" && "p-card",
        padding === "list" && "p-list",
        className,
      )}
      {...props}
    />
  );
});

/** Mono uppercase label (Geist Mono 11px, tracked). */
export function MonoLabel({
  children,
  className,
  onPhoto,
}: {
  children: React.ReactNode;
  className?: string;
  onPhoto?: boolean;
}) {
  return (
    <span className={cn("mono-label", onPhoto && "label-on-photo", className)}>{children}</span>
  );
}
