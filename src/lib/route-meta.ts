import { currentLangFromStorage, translate } from "@/lib/i18n";

export const APP_NAME = "Route";

/** The Route mark on the app's dark ground, for link previews. */
export const OG_IMAGE = "/og-image.png";

export interface PageMetaInput {
  /** English source title, without the app name. */
  title: string;
  description: string;
  /** Defaults to `description`. */
  ogDescription?: string;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
}

type MetaTag = Record<string, string>;

/**
 * Route `head()` runs outside the language provider, so the language comes from
 * localStorage. Every title is suffixed with the app name.
 */
export function pageMeta(input: PageMetaInput): MetaTag[] {
  const lang = currentLangFromStorage();
  const tr = (source: string) => translate(lang, source);
  const title = `${tr(input.title)} — ${APP_NAME}`;
  return [
    { title },
    { name: "description", content: tr(input.description) },
    { property: "og:title", content: title },
    { property: "og:description", content: tr(input.ogDescription ?? input.description) },
    { property: "og:type", content: input.ogType ?? "website" },
    { property: "og:image", content: OG_IMAGE },
    { name: "twitter:card", content: input.twitterCard ?? "summary_large_image" },
    { name: "twitter:image", content: OG_IMAGE },
  ];
}
