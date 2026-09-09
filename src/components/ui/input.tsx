import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
 ({ className, type, ...props }, ref) => {
 return (
 <input
 type={type}
 className={cn(
 "flex h-12 w-full rounded-lg border-2 border-stone-line bg-bone px-3 py-2 font-sans text-base font-normal text-ink transition-colors duration-200 placeholder:text-stone-line focus-visible:border-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/20 disabled:cursor-not-allowed disabled:opacity-50",
 className,
 )}
 ref={ref}
 {...props}
 />
 );
 },
);
Input.displayName = "Input";

export { Input };
