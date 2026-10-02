/**
 * Hero photos. Photos are pre-processed (warm duotone in the home photo's
 * tones, motion blur, a small orange accent) — never add CSS colour filters
 * on top. New photos: same treatment, then add them to TRAIN_PHOTOS with the
 * muscle groups they show.
 */
import placeholder from "@/assets/hero-placeholder.jpg";
import trainArms from "@/assets/train-arms.jpg";
import trainGeneralLift from "@/assets/train-general-lift.jpg";
import trainGeneralSled from "@/assets/train-general-sled.jpg";

/**
 * Train-page photos and the catalog muscle groups each one fits ("any" = a
 * general training photo). A day's routine draws from the photos that match
 * what it trains plus the general ones, one per day.
 */
const TRAIN_PHOTOS: { src: string; muscles: string[] | "any" }[] = [
  { src: placeholder, muscles: ["Quads", "Hamstrings", "Glutes", "Lower back", "Back"] },
  { src: trainArms, muscles: ["Biceps", "Triceps", "Forearms"] },
  { src: trainGeneralSled, muscles: "any" },
  { src: trainGeneralLift, muscles: "any" },
];

/** Photo for the Train hero: matches the routine's muscles, rotates by day. */
export function trainPhoto(muscles: string[], date = new Date()): string {
  const pool = TRAIN_PHOTOS.filter(
    (photo) => photo.muscles === "any" || photo.muscles.some((m) => muscles.includes(m)),
  );
  const day = Math.floor(date.getTime() / 864e5);
  return pool[day % pool.length]!.src;
}

export const heroImages = {
  home: placeholder,
};
