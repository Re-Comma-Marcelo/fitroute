import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/** 40px round glass button for the top row. Always pass an aria-label. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(function IconButton({ asChild, className, type, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      {...(asChild ? {} : { type: type ?? "button" })}
      className={cn(iconButtonClass, className)}
      {...props}
    />
  );
});

/** Same look, for components that render their own <button> (e.g. CoachChatButton). */
export const iconButtonClass =
  "glass inline-flex size-icon-button shrink-0 items-center justify-center rounded-full text-fj-text";
