import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import { Stop } from "./Stop";

const sizes = { sm: "size-5", md: "size-6", lg: "size-8" } as const;

export function BrandIcon({
  icon: Icon,
  size = "md",
  stopped = false,
  className,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size?: keyof typeof sizes;
  stopped?: boolean;
  className?: string | undefined;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0 text-ink", sizes[size], className)}>
      <Icon
        className="size-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {stopped ? <Stop size="icon" className="absolute bottom-0 right-0" /> : null}
    </span>
  );
}
