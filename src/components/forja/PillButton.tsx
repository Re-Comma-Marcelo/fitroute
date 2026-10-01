import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export type PillVariant = "primary" | "secondary" | "dashed";

const VARIANT: Record<PillVariant, string> = {
  primary: "bg-fj-accent text-fj-on-accent",
  secondary: "glass text-fj-text",
  dashed: "border border-dashed border-fj-dashed text-fj-text-2",
};

/** Class string for elements that render their own <button> (e.g. CoachChatButton). */
export function pillClass(variant: PillVariant = "primary", className?: string) {
  return cn(
    "inline-flex h-button items-center justify-center gap-2 rounded-button px-5 text-body font-medium transition-opacity disabled:opacity-50",
    VARIANT[variant],
    className,
  );
}

/** 46px pill button. Primary = turquoise with dark text, never white. */
export const PillButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: PillVariant; asChild?: boolean }
>(function PillButton({ variant = "primary", asChild, className, type, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      {...(asChild ? {} : { type: type ?? "button" })}
      className={pillClass(variant, className)}
      {...props}
    />
  );
});
