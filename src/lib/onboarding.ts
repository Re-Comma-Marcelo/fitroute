/**
 * Onboarding flags. Completion lives on the profile (`onboardingConcluidoEm`)
 * so a new phone does not replay the flow; the local flag is the fallback for
 * accounts whose database row predates that column.
 */
export const ONBOARDING_KEY = "iron-logger-onboarding-done";
const COACH_MARK_KEY = "forja.sessionCoachMarks.v1";
const REST_MARK_KEY = "forja.sessionCoachMarks.rest.v1";
const QUICKSTART_KEY = "iron-logger-quickstart-done";

export function onboardingDone(
  profile?: { onboardingConcluidoEm?: string | undefined } | null,
): boolean {
  if (profile?.onboardingConcluidoEm) return true;
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOnboardingDone() {
  if (typeof window !== "undefined") window.localStorage.setItem(ONBOARDING_KEY, "1");
}

/** QA helper wired to "Review onboarding" in Profile. */
export function resetOnboarding() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ONBOARDING_KEY);
  window.localStorage.removeItem(COACH_MARK_KEY);
  window.localStorage.removeItem(REST_MARK_KEY);
  window.localStorage.removeItem(QUICKSTART_KEY);
}
