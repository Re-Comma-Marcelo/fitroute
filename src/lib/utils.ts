import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type scale tokens from theme.css (text-h1, text-body, …) are font sizes;
 * without this tailwind-merge reads them as colours and drops them whenever a
 * text colour class follows.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["h1", "body", "coach", "meta", "label", "micro", "name"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
