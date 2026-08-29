import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { getProfile, saveProfile } from "@/lib/data/profile";
import type { Profile } from "@/lib/types";

import { registerLanguagePersister, useLanguage } from "./index";
import { isLang, type Lang } from "./types";

/**
 * Keeps the active UI language in sync with the signed-in user's profile:
 * profile -> UI on load, and UI -> profile (database) when the user switches.
 * Mounted once in the app shell.
 */
export function useLanguageSync() {
  const { lang, setLang } = useLanguage();
  const queryClient = useQueryClient();

  useEffect(() => {
    registerLanguagePersister((next: Lang) => {
      void (async () => {
        try {
          const current = queryClient.getQueryData<Profile>(["profile"]) ?? (await getProfile());
          if (current.idioma === next) return;
          const saved = await saveProfile({ ...current, idioma: next });
          queryClient.setQueryData(["profile"], saved);
        } catch (error) {
          // The local preference still applies, but do not hide a failing write.
          console.error("[language] could not persist the language", error);
          toast.error("Could not save your language preference.");
        }
      })();
    });
    return () => registerLanguagePersister(null);
  }, [queryClient]);

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profileLang = profileQuery.data?.idioma;

  useEffect(() => {
    if (isLang(profileLang) && profileLang !== lang) setLang(profileLang, false);
    // Only react to the profile value; the user's manual switch wins otherwise.
  }, [profileLang]); // eslint-disable-line react-hooks/exhaustive-deps
}
