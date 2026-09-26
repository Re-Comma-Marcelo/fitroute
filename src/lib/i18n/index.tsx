import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setFormatLocale } from "@/lib/format";

import { dict as authDict } from "./dict/auth";
import { dict as coachDict } from "./dict/coach";
import { dict as dietDict } from "./dict/diet";
import { dict as foldersDict } from "./dict/folders";
import { dict as exerciseCompleteDict } from "./dict/exercise-complete";
import { dict as exerciseVariantsDict } from "./dict/exercise-variants";
import { dict as generatedDict } from "./dict/generated";
import { dict as homeDict } from "./dict/home";
import { dict as libraryDict } from "./dict/library";
import { dict as metaDict } from "./dict/meta";
import { dict as onboardingDict } from "./dict/onboarding";
import { dict as planDict } from "./dict/plan";

import { dict as profileDict } from "./dict/profile";
import { dict as progressDict } from "./dict/progress";
import { dict as pwaDict } from "./dict/pwa";
import { dict as round10Dict } from "./dict/round10";
import { dict as round11Dict } from "./dict/round11";
import { dict as round12Dict } from "./dict/round12";
import { dict as round13Dict } from "./dict/round13";
import { dict as round14Dict } from "./dict/round14";
import { dict as round15Dict } from "./dict/round15";
import { dict as round16Dict } from "./dict/round16";
import { dict as round17Dict } from "./dict/round17";
import { dict as round18Dict } from "./dict/round18";
import { dict as round19Dict } from "./dict/round19";
import { dict as round20Dict } from "./dict/round20";
import { dict as round21Dict } from "./dict/round21";
import { dict as round22Dict } from "./dict/round22";
import { dict as round23Dict } from "./dict/round23";
import { dict as round24Dict } from "./dict/round24";
import { dict as round25Dict } from "./dict/round25";
import { dict as round26Dict } from "./dict/round26";
import { dict as round27Dict } from "./dict/round27";
import { dict as round28Dict } from "./dict/round28";
import { dict as round29Dict } from "./dict/round29";
import { dict as round30Dict } from "./dict/round30";
import { dict as round31Dict } from "./dict/round31";
import { dict as round32Dict } from "./dict/round32";
import { dict as round33Dict } from "./dict/round33";
import { dict as round34Dict } from "./dict/round34";

import { dict as sessionDict } from "./dict/session";
import { dict as crossTrainingDict } from "./dict/cross-training";
import { dict as sessionFocusDict } from "./dict/session-focus";
import { dict as sessionStartDict } from "./dict/session-start";
import { dict as weeklyCheckinDict } from "./dict/weekly-checkin";
import { dict as shellDict } from "./dict/shell";
import { dict as toolsDict } from "./dict/tools";
import { dict as trainDict } from "./dict/train";
import { dict as upgradesDict } from "./dict/upgrades";
import {
  DEFAULT_LANG,
  LANGS,
  LANG_STORAGE_KEY,
  isLang,
  localeFor,
  type Dict,
  type DictFragment,
  type Lang,
} from "./types";

export { LANGS, type Lang } from "./types";

const FRAGMENTS: DictFragment[] = [
  shellDict,
  homeDict,
  trainDict,
  upgradesDict,
  sessionDict,
  sessionFocusDict,
  sessionStartDict,
  exerciseCompleteDict,
  exerciseVariantsDict,
  weeklyCheckinDict,
  crossTrainingDict,
  libraryDict,
  dietDict,
  progressDict,
  profileDict,
  coachDict,
  planDict,
  generatedDict,
  metaDict,
  pwaDict,
  onboardingDict,
  toolsDict,
  round10Dict,
  round11Dict,
  round12Dict,
  round13Dict,
  round14Dict,
  round15Dict,
  round16Dict,
  round17Dict,
  round18Dict,
  round19Dict,
  round20Dict,
  round21Dict,
  round22Dict,
  round23Dict,
  round24Dict,
  round25Dict,
  round26Dict,
  round27Dict,
  round28Dict,
  round29Dict,
  round30Dict,
  round31Dict,
  round32Dict,
  round33Dict,
  round34Dict,
  foldersDict,
  authDict,
];

function merge(pick: (f: DictFragment) => Dict): Dict {
  return Object.assign({}, ...FRAGMENTS.map(pick)) as Dict;
}

const DICTIONARIES: Record<Lang, Dict> = {
  en: {},
  pt: merge((f) => f.pt),
  nl: merge((f) => f.nl),
};

export type Vars = Record<string, string | number>;

/** Translate an English source string, then interpolate {placeholders}. */
export function translate(lang: Lang, source: string, vars?: Vars): string {
  const translated = DICTIONARIES[lang]?.[source] ?? source;
  if (!vars) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type TFunction = (source: string, vars?: Vars) => string;

interface LanguageContextValue {
  lang: Lang;
  locale: string;
  /** Change the active language. `persist` writes it to the user's profile. */
  setLang: (lang: Lang, persist?: boolean) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (isLang(stored)) return stored;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("nl")) return "nl";
  return DEFAULT_LANG;
}

/** Language for components rendered outside the provider (error boundaries). */
export function currentLangFromStorage(): Lang {
  return readStoredLang();
}

/** Persisting the choice to the profile is injected so i18n stays data-agnostic. */
let persistLanguage: ((lang: Lang) => void) | null = null;
export function registerLanguagePersister(fn: ((lang: Lang) => void) | null) {
  persistLanguage = fn;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  setFormatLocale(localeFor(lang), (source, vars) => translate(lang, source, vars));

  useEffect(() => {
    setFormatLocale(localeFor(lang), (source, vars) => translate(lang, source, vars));
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang, persist = true) => {
    setLangState((current) => {
      if (current === next) return current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      }
      if (persist) persistLanguage?.(next);
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      locale: localeFor(lang),
      setLang,
      t: (source, vars) => translate(lang, source, vars),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Outside the provider (rare: isolated tests) fall back to English.
    return {
      lang: DEFAULT_LANG,
      locale: localeFor(DEFAULT_LANG),
      setLang: () => {},
      t: (source, vars) => translate(DEFAULT_LANG, source, vars),
    };
  }
  return ctx;
}

/** Main hook for components: `const t = useT(); t("Start workout")`. */
export function useT(): TFunction {
  return useLanguage().t;
}
