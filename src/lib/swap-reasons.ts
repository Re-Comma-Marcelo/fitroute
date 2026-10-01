import type { SwapReason } from "./types";

/**
 * Why a session strayed from the standard routine, in the order the chips
 * show. Labels are English source strings: translate with t() at render time.
 */
export const SWAP_REASONS: { id: SwapReason; label: string }[] = [
  { id: "busy", label: "Short on time" },
  { id: "social", label: "Training with friends" },
  { id: "equipment", label: "Equipment taken" },
  { id: "pain", label: "Pain or discomfort" },
  { id: "difficulty", label: "Too hard today" },
  { id: "preference", label: "Just felt like it" },
];

export function swapReasonLabel(reason: SwapReason | null | undefined): string | null {
  return SWAP_REASONS.find((r) => r.id === reason)?.label ?? null;
}
