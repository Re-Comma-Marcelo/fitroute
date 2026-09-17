/**
 * Common retail package sizes for shelf-stable, packaged ingredients — so the
 * shopping list can say "buy 1× 200 g" instead of the raw "20 g" a week of
 * recipes actually needs. Nobody can buy exactly 20 g of butter off a shelf.
 *
 * Deliberately narrow: only items genuinely sold in a standard fixed size.
 * Fresh produce, meat and fish are bought by weight, so they are left as a
 * plain quantity rather than guessing a package that does not exist.
 */
interface PackageSize {
  /** Substring matched against the lowercased ingredient name. */
  match: string;
  size: number;
  unit: "g" | "ml";
}

const PACKAGE_SIZES: PackageSize[] = [
  { match: "manteiga", size: 200, unit: "g" },
  { match: "leite", size: 1000, unit: "ml" },
  { match: "azeite", size: 500, unit: "ml" },
  { match: "arroz", size: 1000, unit: "g" },
  { match: "feijão", size: 1000, unit: "g" },
  { match: "macarrão", size: 500, unit: "g" },
  { match: "aveia", size: 400, unit: "g" },
  { match: "queijo", size: 200, unit: "g" },
  { match: "requeijão", size: 200, unit: "g" },
  { match: "creme de leite", size: 200, unit: "g" },
  { match: "iogurte", size: 170, unit: "g" },
  { match: "granola", size: 250, unit: "g" },
  { match: "castanha", size: 150, unit: "g" },
  { match: "pasta de amendoim", size: 500, unit: "g" },
  { match: "whey", size: 900, unit: "g" },
  { match: "polpa de açaí", size: 1000, unit: "g" },
  { match: "molho de tomate", size: 340, unit: "g" },
  { match: "goma de tapioca", size: 500, unit: "g" },
  { match: "flocão", size: 500, unit: "g" },
  { match: "café", size: 500, unit: "g" },
];

export interface PackageSuggestion {
  packages: number;
  size: number;
  unit: "g" | "ml";
}

/**
 * How many standard packages to buy for a raw quantity needed, or null when
 * this ingredient has no standard package size (fresh produce, meat, fish).
 */
export function suggestedPackage(
  name: string,
  qty: number,
  unit: string,
): PackageSuggestion | null {
  if ((unit !== "g" && unit !== "ml") || qty <= 0) return null;
  const lower = name.toLowerCase();
  const match = PACKAGE_SIZES.find((p) => p.unit === unit && lower.includes(p.match));
  if (!match) return null;
  return { packages: Math.max(1, Math.ceil(qty / match.size)), size: match.size, unit: match.unit };
}
