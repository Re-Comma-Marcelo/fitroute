import { APP_NAME, pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import heroLogin from "@/assets/hero-login.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouteLogoTile } from "@/components/RouteLogo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useT, type TFunction } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Sign in",
      description:
        "Sign in to Route: your route to your goal, with checkpoints, routines and a coach built from your own history.",
      ogDescription:
        "From the starting point to the goal, one workout at a time. Sign in with your email.",
    }),
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
/** Which email we asked the user to go and open. */
type Sent = "signup" | "magic" | "reset";
type Notice = { kind: "error" | "info"; text: string; action?: "signin" | "resend" };

const RESUME_KEY = "ironlogger.oauth.resume";
const RESEND_COOLDOWN_SEC = 45;

/** Same-origin path to resume after sign-in (e.g. the MCP consent screen). */
function resumeTarget(): string | null {
  if (typeof window === "undefined") return null;
  const fromQuery = new URLSearchParams(window.location.search).get("redirect");
  const stored = window.sessionStorage.getItem(RESUME_KEY);
  const candidate = fromQuery ?? stored;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return null;
  return candidate;
}

/** Supabase sends email-link failures back as query or hash parameters. */
function linkParams(url: string): URLSearchParams {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const merged = new URLSearchParams(parsed.search);
    new URLSearchParams(hash).forEach((value, key) => merged.set(key, value));
    return merged;
  } catch {
    return new URLSearchParams();
  }
}

/**
 * Turn a Supabase auth error into something a person can act on. The raw
 * messages ("Invalid login credentials") send people in circles: the same
 * reply covers a typo, an unconfirmed email and an account that never
 * finished being created.
 */
function authMessage(t: TFunction, raw: string, code: string): Notice {
  const text = `${code} ${raw}`.toLowerCase();
  if (/user already registered|already registered|user_already_exists/.test(text)) {
    return {
      kind: "error",
      text: t("That email already has an account. Sign in instead, or reset the password."),
      action: "signin",
    };
  }
  if (/email not confirmed|email_not_confirmed/.test(text)) {
    return {
      kind: "error",
      text: t("Your email isn't confirmed yet. Open the link we sent, or send it again."),
      action: "resend",
    };
  }
  if (/invalid login credentials|invalid_credentials/.test(text)) {
    return {
      kind: "error",
      text: t(
        "Email or password doesn't match. If you just signed up, confirm your email first — or sign in with a magic link.",
      ),
    };
  }
  if (/password should be at least|weak_password/.test(text)) {
    return { kind: "error", text: t("Use a password with at least 6 characters.") };
  }
  if (/email address .* is invalid|validation_failed.*email|invalid format/.test(text)) {
    return { kind: "error", text: t("That email address doesn't look valid.") };
  }
  if (/rate limit|over_email_send_rate_limit|too many requests|429/.test(text)) {
    return {
      kind: "error",
      text: t("Too many emails were requested. Wait a few minutes and try again."),
    };
  }
  if (/signups not allowed|signup_disabled/.test(text)) {
    return {
      kind: "error",
      text: t("New sign-ups are turned off on this project right now."),
    };
  }
  if (/otp_expired|token has expired|invalid or has expired|one-time token not found/.test(text)) {
    return {
      kind: "error",
      text: t("That link expired or was already used. Send a new one below."),
      action: "resend",
    };
  }
  return { kind: "error", text: raw || t("Could not sign in") };
}

function errorParts(error: unknown): { raw: string; code: string } {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return { raw, code };
}

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [cooldown, setCooldown] = useState(0);
  // Read once, before the Supabase client consumes the URL fragment.
  const [entryUrl] = useState(() => (typeof window === "undefined" ? "" : window.location.href));

  const cleanEmail = email.trim().toLowerCase();

  function goAfterAuth() {
    const target = resumeTarget();
    if (target) {
      window.sessionStorage.removeItem(RESUME_KEY);
      window.location.replace(target);
      return;
    }
    navigate({ to: "/inicio", replace: true });
  }

  function redirectUrl() {
    const target = resumeTarget();
    if (target) window.sessionStorage.setItem(RESUME_KEY, target);
    return target
      ? `${window.location.origin}/?redirect=${encodeURIComponent(target)}`
      : window.location.origin;
  }

  // A failed or expired email link comes back as parameters on this page.
  useEffect(() => {
    const params = linkParams(entryUrl);
    const isRecovery = params.get("type") === "recovery";
    const rawError = params.get("error_description") ?? params.get("error") ?? "";
    const errorCode = params.get("error_code") ?? "";
    if (isRecovery) setRecovering(true);
    if (rawError) {
      setNotice(authMessage(t, rawError.replace(/\+/g, " "), errorCode));
      setMode("signin");
      // Keep the address bar clean so a refresh doesn't repeat the message.
      window.history.replaceState(null, "", window.location.pathname);
    }
    // The session only arrives after Supabase parses the URL.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, [entryUrl, t]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    let alive = true;
    // Keep the pending consent URL across the OAuth round trip.
    const pending = resumeTarget();
    if (pending) window.sessionStorage.setItem(RESUME_KEY, pending);
    // Someone setting a new password is signed in already: don't bounce them.
    if (linkParams(entryUrl).get("type") === "recovery") return;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user || recovering) return;
      if (pending) {
        window.sessionStorage.removeItem(RESUME_KEY);
        window.location.replace(pending);
        return;
      }
      navigate({ to: "/inicio", replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate, entryUrl, recovering]);

  function requireEmail(): boolean {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return true;
    setNotice({ kind: "error", text: t("Enter your email address first.") });
    return false;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: redirectUrl() },
        });
        if (error) throw error;
        // Supabase hides existing accounts behind an empty identities array.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode("signin");
          setNotice({
            kind: "error",
            text: t("That email already has an account. Sign in instead, or reset the password."),
          });
          return;
        }
        if (!data.session) {
          setSent("signup");
          setCooldown(RESEND_COOLDOWN_SEC);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      }
      goAfterAuth();
    } catch (error) {
      const { raw, code } = errorParts(error);
      setNotice(authMessage(t, raw, code));
    } finally {
      setBusy(false);
    }
  }

  /** Magic link: creates the account too, so nobody is stuck on a password. */
  async function handleMagicLink() {
    if (!requireEmail()) return;
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
      });
      if (error) throw error;
      setSent("magic");
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (error) {
      const { raw, code } = errorParts(error);
      setNotice(authMessage(t, raw, code));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!requireEmail()) return;
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl(),
      });
      if (error) throw error;
      setSent("reset");
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (error) {
      const { raw, code } = errorParts(error);
      setNotice(authMessage(t, raw, code));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!requireEmail() || cooldown > 0) return;
    setBusy(true);
    setNotice(null);
    try {
      if (sent === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
        });
        if (error) throw error;
      } else if (sent === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: { emailRedirectTo: redirectUrl() },
        });
        if (error) throw error;
      }
      setCooldown(RESEND_COOLDOWN_SEC);
      setNotice({ kind: "info", text: t("Sent. It can take a minute to arrive.") });
    } catch (error) {
      const { raw, code } = errorParts(error);
      setNotice(authMessage(t, raw, code));
    } finally {
      setBusy(false);
    }
  }

  async function handleNewPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      goAfterAuth();
    } catch (error) {
      const { raw, code } = errorParts(error);
      setNotice(authMessage(t, raw, code));
    } finally {
      setBusy(false);
    }
  }

  function resetToSignIn() {
    setSent(null);
    setNotice(null);
    setMode("signin");
  }

  const noticeBox = notice ? (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm leading-relaxed text-foreground",
        notice.kind === "error"
          ? "border-destructive/30 bg-destructive/10"
          : "border-border bg-surface-2",
      )}
    >
      <p>{notice.text}</p>
      {notice.action === "signin" ? (
        <button
          type="button"
          className="mt-2 min-h-11 font-semibold text-primary"
          onClick={resetToSignIn}
        >
          {t("Back to sign in")}
        </button>
      ) : null}
      {notice.action === "resend" ? (
        <button
          type="button"
          disabled={busy || cooldown > 0}
          className="mt-2 min-h-11 font-semibold text-primary disabled:opacity-50"
          onClick={handleResend}
        >
          {cooldown > 0
            ? t("Send again in {seconds}s", { seconds: cooldown })
            : t("Send a new link")}
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <main className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-background">
      <img
        src={heroLogin}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/85 to-background" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/20 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-24">
        <div className="flex items-center gap-3">
          <RouteLogoTile draw />
          <div>
            <p className="font-display text-lg font-semibold leading-none text-foreground">
              {APP_NAME}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {t("Your route to your goal")}
            </p>
          </div>
        </div>

        <h1 className="mt-7 font-display text-[2rem] font-semibold leading-[1.1] text-foreground">
          {t("From the starting point to the goal, one workout at a time.")}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {t(
            "Log sets in two taps. Your route, your training and your coach, built from your own history.",
          )}
        </p>

        <div className="mt-8 rounded-3xl border border-border/60 bg-card/80 p-5 backdrop-blur-xl">
          {recovering ? (
            <form onSubmit={handleNewPassword} className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("Set a new password")}
              </h2>
              {noticeBox}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("New password")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("At least 6 characters")}
                />
              </div>
              <Button type="submit" disabled={busy} className="tap-target w-full font-semibold">
                {busy ? t("Please wait…") : t("Save and continue")}
              </Button>
            </form>
          ) : sent ? (
            <div className="space-y-3 text-center">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("Check your email")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {sent === "reset"
                  ? t("We sent a password reset link to {email}.", { email: cleanEmail })
                  : sent === "magic"
                    ? t("We sent a sign-in link to {email}. Open it on this device.", {
                        email: cleanEmail,
                      })
                    : t("We sent a confirmation link to {email}. Confirm it, then sign in.", {
                        email: cleanEmail,
                      })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("No email? Check spam and promotions — the link is valid for one use only.")}
              </p>
              {noticeBox}
              <Button
                variant="outline"
                disabled={busy || cooldown > 0}
                className="tap-target w-full"
                onClick={handleResend}
              >
                {cooldown > 0
                  ? t("Send again in {seconds}s", { seconds: cooldown })
                  : t("Send the email again")}
              </Button>
              <Button variant="ghost" className="tap-target w-full" onClick={resetToSignIn}>
                {t("Back to sign in")}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
                {(["signin", "signup"] as Mode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setNotice(null);
                    }}
                    className={cn(
                      "tap-target rounded-lg text-sm font-medium transition-colors",
                      mode === value ? "bg-surface-3 text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(value === "signin" ? "Sign in" : "Create account")}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {noticeBox}
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("Email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("you@email.com")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("Password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("At least 6 characters")}
                  />
                </div>
                <Button type="submit" disabled={busy} className="tap-target w-full font-semibold">
                  {busy
                    ? t("Please wait…")
                    : mode === "signup"
                      ? t("Create account")
                      : t("Sign in")}
                </Button>
              </form>

              <div className="mt-4 space-y-1 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={handleMagicLink}
                  className="tap-target w-full"
                >
                  {t("Email me a sign-in link")}
                </Button>
                <p className="px-1 pt-1 text-center text-xs text-muted-foreground">
                  {t("No password needed — the link signs you in and creates your account.")}
                </p>
                {mode === "signin" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleForgotPassword}
                    className="tap-target w-full text-sm font-medium text-primary disabled:opacity-50"
                  >
                    {t("Forgot your password?")}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
