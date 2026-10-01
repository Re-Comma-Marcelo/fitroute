import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FOLDER_QUERY_KEYS } from "@/components/folders/FoldersSheet";
import type { VariationSession } from "@/lib/data/folders";
import { applySwapsToRoutine, promoteVariation } from "@/lib/data/routines";
import { useT } from "@/lib/i18n";

/** Folder actions shared by the Train tab and the folder detail sheet. */
export function useFolderActions() {
  const t = useT();
  const queryClient = useQueryClient();

  async function refreshFolderViews() {
    await Promise.all(
      FOLDER_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

  /** A saved variation becomes the standard; its original steps back to a variation. */
  async function promoteRoutine(routineId: string) {
    try {
      const promoted = await promoteVariation(routineId);
      await refreshFolderViews();
      if (promoted) toast.success(t("{name} is now a standard routine.", { name: promoted.nome }));
    } catch {
      toast.error(t("Could not update the routine. Try again."));
    }
  }

  /** A one-off session's swaps become the routine's standard exercises. */
  async function promoteSession(session: VariationSession) {
    try {
      await applySwapsToRoutine(session.routine.id, session.swaps);
      await refreshFolderViews();
      toast.success(t("{name} updated with these swaps.", { name: session.routine.nome }));
    } catch {
      toast.error(t("Could not update the routine. Try again."));
    }
  }

  return { refreshFolderViews, promoteRoutine, promoteSession };
}
