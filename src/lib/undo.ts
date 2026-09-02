/**
 * Destructive actions should never be a dead end. Every place that throws
 * something away calls this, so the user always gets one toast with the same
 * "Undo" affordance instead of a silent disappearance.
 */

import { toast } from "sonner";

const UNDO_WINDOW_MS = 6000;

export function undoToast({
  message,
  undoLabel,
  onUndo,
}: {
  message: string;
  undoLabel: string;
  onUndo: () => void;
}) {
  let used = false;
  toast(message, {
    duration: UNDO_WINDOW_MS,
    action: {
      label: undoLabel,
      onClick: () => {
        if (used) return;
        used = true;
        onUndo();
      },
    },
  });
}
