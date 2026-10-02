/**
 * Hero photos. Photos are pre-processed (warm duotone in the home photo's
 * tones, motion blur, a small orange accent) — never add CSS colour filters
 * on top. New photos: same treatment, then add them to TRAIN_PHOTOS with the
 * muscle groups they show.
 */
import placeholder from "@/assets/hero-placeholder.jpg";
import trainArms from "@/assets/train-arms.jpg";

/**
 * Train-page photos and the catalog muscle groups each one fits. A day's
 * routine gets a photo that matches what it trains; with several matches the
 * photo changes per day.
 */
const TRAIN_PHOTOS: { src: string; muscles: string[] }[] = [
  { src: placeholder, muscles: ["Quads", "Hamstrings", "Glutes", "Lower back", "Back"] },
  { src: trainArms, muscles: ["Biceps", "Triceps", "Forearms"] },
];

/** Photo for the Train hero: matches the routine's muscles, rotates by day. */
export function trainPhoto(muscles: string[], date = new Date()): string {
  const matches = TRAIN_PHOTOS.filter((photo) => photo.muscles.some((m) => muscles.includes(m)));
  const pool = matches.length ? matches : TRAIN_PHOTOS;
  const day = Math.floor(date.getTime() / 864e5);
  return pool[day % pool.length]!.src;
}

export const heroImages = {
  home: placeholder,
};
