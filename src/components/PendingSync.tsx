import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushQueue, onPendingChange, pendingCount } from "@/lib/offline-queue";
import { saveWorkout } from "@/lib/data/workouts";
import { useT } from "@/lib/i18n";

/**
 * Workouts finished without connection. Visible until they reach the server,
 * retried automatically when the device comes back online.
 */
export function PendingSync() {
  const t = useT();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const flush = useCallback(
    async (announce: boolean) => {
      if (pendingCount() === 0) return;
      setSyncing(true);
      const sent = await flushQueue(saveWorkout);
      setSyncing(false);
      if (sent > 0) {
        void queryClient.invalidateQueries({ queryKey: ["workouts"] });
        void queryClient.invalidateQueries({ queryKey: ["workoutLog"] });
        if (announce) toast.success(t("{n} pending workout(s) synced.", { n: sent }));
      } else if (announce) {
        toast.error(t("Still no connection — your workouts are safe on this device."));
      }
    },
    [queryClient, t],
  );

  useEffect(() => {
    setCount(pendingCount());
    const unsubscribe = onPendingChange(setCount);
    const onOnline = () => void flush(true);
    window.addEventListener("online", onOnline);
    // One quiet attempt on app start.
    void flush(false);
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, [flush]);

  if (count === 0) return null;

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-2">
      <div className="flex items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2">
        <CloudOff className="size-4 shrink-0 text-warn" />
        <p className="flex-1 text-xs font-medium text-foreground">
          {t("{n} workout(s) waiting to sync", { n: count })}
        </p>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void flush(true)}
          className="tap-target inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} />
          {t("Retry")}
        </button>
      </div>
    </div>
  );
}
