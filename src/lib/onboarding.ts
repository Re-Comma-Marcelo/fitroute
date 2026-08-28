/** Onboarding flags (local-only, no schema changes). */
export const ONBOARDING_KEY = "iron-logger-onboarding-done";
const COACH_MARK_KEY = "forja.sessionCoachMarks.v1";
const QUICKSTART_KEY = "iron-logger-quickstart-done";

export function onboardingDone(): boolean {
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
  window.localStorage.removeItem(QUICKSTART_KEY);
}
