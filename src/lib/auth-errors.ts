import type { TFunction } from "@/lib/i18n";

/**
 * Supabase reports auth failures as raw English strings with an optional
 * machine code. New people hit these more than anyone, so every case a person
 * can actually act on gets a translated message that says what to do next.
 */
export function authErrorMessage(error: unknown, mode: "signin" | "signup", t: TFunction): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const is = (machine: string, pattern: RegExp) => code === machine || pattern.test(raw);

  if (is("signup_disabled", /signups? not allowed|signup is disabled/i)) {
    return t("New accounts are turned off for this app right now. Ask for an invite.");
  }
  if (is("email_provider_disabled", /email (logins|signups) are disabled/i)) {
    return t("Email sign-up is turned off for this app right now. Ask for an invite.");
  }
  if (is("user_already_exists", /user already registered|already been registered/i)) {
    return t("This email already has an account. Switch to Sign in and use your password.");
  }
  if (is("invalid_credentials", /invalid login credentials/i)) {
    return mode === "signin"
      ? t("Wrong email or password. If you are new here, create an account first.")
      : t("Those details were not accepted. Check the email and password and try again.");
  }
  if (is("email_not_confirmed", /email not confirmed/i)) {
    return t("Confirm your email first — open the link we sent you, then sign in.");
  }
  if (is("weak_password", /password should be at least|password is too short/i)) {
    return t("That password is too short. Use at least 6 characters.");
  }
  if (is("email_address_invalid", /unable to validate email address|invalid format/i)) {
    return t("That email address does not look valid.");
  }
  if (is("over_email_send_rate_limit", /email rate limit exceeded/i)) {
    return t(
      "Too many confirmation emails were requested. Please wait a few minutes before trying again.",
    );
  }
  if (is("over_request_rate_limit", /too many requests|rate limit/i)) {
    return t("Too many attempts. Wait a minute and try again.");
  }

  if (raw) return raw;
  return mode === "signup" ? t("Could not create your account") : t("Could not sign in");
}
