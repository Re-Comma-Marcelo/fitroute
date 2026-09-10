import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { AlertTriangle } from "lucide-react";

/**
 * Shared "something failed to load" block, so every screen fails the same way:
 * a plain sentence plus a retry button that refetches the query.
 */
export function QueryError({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry: () => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center ${className ?? ""}`}
    >
      <AlertTriangle className="mx-auto size-5 text-destructive" />
      <p className="mt-2 font-display text-sm font-semibold">
        {message ?? t("Could not load this data.")}
      </p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {t("Check your connection — your logged data is safe.")}
      </p>
      <Button variant="outline" className="tap-target mt-3" onClick={onRetry}>
        {t("Try again")}
      </Button>
    </div>
  );
}
