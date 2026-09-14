import routeLogoAsset from "@/assets/route-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function RouteLogo({
  className,
  title,
}: {
  className?: string;
  /** Leave unset for decorative use next to the wordmark. */
  title?: string;
}) {
  return (
    <img
      src={routeLogoAsset.url}
      alt={title ?? ""}
      className={cn("size-8 object-contain", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      draggable={false}
    />
  );
}

/**
 * Mark on the dark app tile, matching the installed home-screen icon.
 */
export function RouteLogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-surface-2 to-background",
        className,
      )}
    >
      <RouteLogo className="size-[64%]" />
    </span>
  );
}
