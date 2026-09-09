import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
 "inline-flex items-center rounded-sm px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.16em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
 {
 variants: {
 variant: {
 default: "bg-violet text-bone",
 secondary: "bg-steel text-bone",
 destructive: "bg-oxide text-bone",
 outline: "border-2 border-stone-line text-ink",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 },
);

export interface BadgeProps
 extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
 return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
