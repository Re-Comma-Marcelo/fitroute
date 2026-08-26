export type Lang = "en" | "pt" | "nl";

export const LANGS: { value: Lang; label: string; locale: string }[] = [
  { value: "en", label: "English", locale: "en-US" },
  { value: "pt", label: "Português", locale: "pt-BR" },
  { value: "nl", label: "Nederlands", locale: "nl-NL" },
];

export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "forja-lang";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "pt" || value === "nl";
}

export function localeFor(lang: Lang): string {
  return LANGS.find((l) => l.value === lang)?.locale ?? "en-US";
}

/** Dictionary fragment: English source string -> translation. */
export type Dict = Record<string, string>;
export interface DictFragment {
  pt: Dict;
  nl: Dict;
}
