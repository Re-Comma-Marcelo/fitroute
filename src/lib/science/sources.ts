/**
 * The studies the app's numbers rest on, shown as tappable sources next to
 * the advice they back. Only bibliographic facts and a link live here — the
 * findings are summarised in our own words where they are shown (facts and
 * citations are free to use; an article's own text and figures are not).
 *
 * Every link was checked by hand. Add a source only with a working link to
 * the paper itself (PubMed, PMC, the publisher or a DOI).
 */
export type SourceId =
  | "aragon"
  | "iraki2019"
  | "helms2023"
  | "garthe2013"
  | "garthe2011"
  | "larsonMeyer2022"
  | "bray2012"
  | "benito2020"
  | "barakat2020"
  | "rhea2003"
  | "schoenfeld2016"
  | "schoenfeld2017"
  | "pelland2024"
  | "simao2012"
  | "acsm2009"
  | "refalo2023";

export interface Source {
  /** "Iraki et al. 2019" — what the advice line names. */
  cite: string;
  title: string;
  journal: string;
  /** Null for a published expert model with no paper of its own. */
  url: string | null;
}

export const SOURCES: Record<SourceId, Source> = {
  aragon: {
    cite: "Aragon",
    title: "Rate-of-muscle-gain model for natural lifters (expert model, not a study)",
    journal: "Alan Aragon",
    url: null,
  },
  iraki2019: {
    cite: "Iraki et al. 2019",
    title: "Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review",
    journal: "Sports 7(7):154",
    url: "https://doi.org/10.3390/sports7070154",
  },
  helms2023: {
    cite: "Helms et al. 2023",
    title:
      "Effect of Small and Large Energy Surpluses on Strength, Muscle, and Skinfold Thickness in Resistance-Trained Individuals",
    journal: "Sports Medicine - Open",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10620361/",
  },
  garthe2013: {
    cite: "Garthe et al. 2013",
    title:
      "Effect of nutritional intervention on body composition and performance in elite athletes",
    journal: "European Journal of Sport Science",
    url: "https://pubmed.ncbi.nlm.nih.gov/23679146/",
  },
  garthe2011: {
    cite: "Garthe et al. 2011",
    title:
      "Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes",
    journal: "Int J Sport Nutr Exerc Metab 21(2):97-104",
    url: "https://www.semanticscholar.org/paper/4bbc8d4a33c5e9c7fd9bea4f1d9687dd05c997af",
  },
  larsonMeyer2022: {
    cite: "Larson-Meyer et al. 2022",
    title: "Weight Gain Recommendations for Athletes and Military Personnel: a Critical Review",
    journal: "Current Nutrition Reports",
    url: "https://pubmed.ncbi.nlm.nih.gov/35233712/",
  },
  bray2012: {
    cite: "Bray et al. 2012",
    title:
      "Effect of Dietary Protein Content on Weight Gain, Energy Expenditure, and Body Composition During Overeating",
    journal: "JAMA",
    url: "https://jamanetwork.com/journals/jama/fullarticle/1103993",
  },
  benito2020: {
    cite: "Benito et al. 2020",
    title:
      "A Systematic Review with Meta-Analysis of the Effect of Resistance Training on Whole-Body Muscle Growth in Healthy Adult Males",
    journal: "Int J Environ Res Public Health",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7068252/",
  },
  barakat2020: {
    cite: "Barakat et al. 2020",
    title:
      "Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time?",
    journal: "Strength and Conditioning Journal",
    url: "https://www.semanticscholar.org/paper/fa40632e786fa5a9b0409993ca8455cd53c8fc16",
  },
  rhea2003: {
    cite: "Rhea et al. 2003",
    title: "A Meta-analysis to Determine the Dose Response for Strength Development",
    journal: "Medicine & Science in Sports & Exercise",
    url: "https://doi.org/10.1249/01.MSS.0000053727.63505.D4",
  },
  schoenfeld2016: {
    cite: "Schoenfeld et al. 2016",
    title:
      "Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis",
    journal: "Sports Medicine",
    url: "https://link.springer.com/article/10.1007/s40279-016-0543-8",
  },
  schoenfeld2017: {
    cite: "Schoenfeld et al. 2017",
    title:
      "Dose-response relationship between weekly resistance training volume and increases in muscle mass",
    journal: "Journal of Sports Sciences",
    url: "https://pubmed.ncbi.nlm.nih.gov/27433992/",
  },
  pelland2024: {
    cite: "Pelland et al. 2024",
    title:
      "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains",
    journal: "Meta-regression, indexed on PubMed",
    url: "https://pubmed.ncbi.nlm.nih.gov/41343037/",
  },
  simao2012: {
    cite: "Simão et al. 2012",
    title: "Exercise Order in Resistance Training",
    journal: "Sports Medicine 42:251-265",
    url: "https://pubmed.ncbi.nlm.nih.gov/22292516/",
  },
  acsm2009: {
    cite: "ACSM 2009",
    title: "Progression Models in Resistance Training for Healthy Adults (position stand)",
    journal: "Medicine & Science in Sports & Exercise 41(3):687-708",
    url: "https://pubmed.ncbi.nlm.nih.gov/19204579/",
  },
  refalo2023: {
    cite: "Refalo et al. 2023",
    title: "Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy",
    journal: "Sports Medicine 53(3):649-665",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9935748/",
  },
};
