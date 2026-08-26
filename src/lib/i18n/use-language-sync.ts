import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
        } catch {
          // Offline or signed out: the local preference still applies.
        }
      })();
    });
    return () => registerLanguagePersister(null);
  }, [queryClient]);

  const profileLang = queryClient.getQueryData<Profile>(["profile"])?.idioma;

  useEffect(() => {
    if (isLang(profileLang) && profileLang !== lang) setLang(profileLang, false);
    // Only react to the profile value; the user's manual switch wins otherwise.
  }, [profileLang]); // eslint-disable-line react-hooks/exhaustive-deps
}
