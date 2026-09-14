import { APP_NAME, pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import heroLogin from "@/assets/hero-login.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouteLogoTile } from "@/components/RouteLogo";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { fetchAuthSettings, type AuthSettings } from "@/lib/auth-settings";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Sign in",
      description:
        "Sign in to Route to log sets in two taps, follow adaptive routines and track real strength progress.",
      ogDescription:
        "Your AI trainer that adapts to your actual life. Sign in with Google or email.",
    }),
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

const RESUME_KEY = "ironlogger.oauth.resume";

/** Same-origin path to resume after sign-in (e.g. the MCP consent screen). */
function resumeTarget(): string | null {
  if (typeof window === "undefined") return null;
  const fromQuery = new URLSearchParams(window.location.search).get("redirect");
  const stored = window.sessionStorage.getItem(RESUME_KEY);
  const candidate = fromQuery ?? stored;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return null;
  return candidate;
}

/** Where Supabase sends people back to after OAuth or a confirmation link. */
function redirectUrl(target: string | null): string {
  return target
    ? `${window.location.origin}/?redirect=${encodeURIComponent(target)}`
    : window.location.origin;
}

/** `/?mode=signup` opens the form ready to create an account — shareable link. */
function initialMode(): Mode {
  if (typeof window === "undefined") return "signin";
  return new URLSearchParams(window.location.search).get("mode") === "signup"
    ? "signup"
    : "signin";
}

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [formError, setFormError] = useState("");
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // A provider button that cannot work is a closed door on the way in, so it
  // only renders once the project confirms the provider is enabled. When the
  // settings endpoint is unreachable we keep showing it and fall back to the
  // error toast.
  const showGoogle = settingsLoaded && (settings ? settings.providers["google"] === true : true);
  const signupDisabled = settings?.signupDisabled === true;

  function goAfterAuth() {
    const target = resumeTarget();
    if (target) {
      window.sessionStorage.removeItem(RESUME_KEY);
      window.location.replace(target);
      return;
    }
    navigate({ to: "/inicio", replace: true });
  }

  useEffect(() => {
    let alive = true;
    fetchAuthSettings().then((loaded) => {
      if (!alive) return;
      setSettings(loaded);
      setSettingsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    // Keep the pending consent URL across the OAuth round trip.
    const pending = resumeTarget();
    if (pending) window.sessionStorage.setItem(RESUME_KEY, pending);
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
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
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    try {
      const target = resumeTarget();
      if (target) window.sessionStorage.setItem(RESUME_KEY, target);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl(target) },
      });
      if (error) throw error;
    } catch (error) {
      setBusy(false);
      const raw = error instanceof Error ? error.message : "";
      const notEnabled = /provider is not enabled|Unsupported provider|validation_failed/i.test(
        raw,
      );
      if (notEnabled) {
        // The project disabled it since the page loaded — drop the button too.
        setSettings((current) =>
          current ? { ...current, providers: { ...current.providers, google: false } } : current,
        );
      }
      toast.error(
        notEnabled
          ? t("Google sign-in isn't available right now. Use email and password instead.")
          : raw || t("Google sign-in failed"),
      );
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const target = resumeTarget();
      if (target) window.sessionStorage.setItem(RESUME_KEY, target);
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl(target) },
        });
        if (error) throw error;
        // Supabase hides "this email exists" behind a user with no identities.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode("signin");
          setFormError(
            t("This email already has an account. Switch to Sign in and use your password."),
          );
          return;
        }
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      goAfterAuth();
    } catch (error) {
      setFormError(authErrorMessage(error, mode, t));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setFormError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl(resumeTarget()) },
      });
      if (error) throw error;
      toast.success(t("Confirmation email sent again."));
    } catch (error) {
      setFormError(authErrorMessage(error, "signup", t));
    } finally {
      setBusy(false);
    }
  }

  const errorBox = formError ? (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-foreground"
    >
      {formError}
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
          <RouteLogoTile />
          <div>
            <p className="font-display text-lg font-semibold leading-none text-foreground">
              {APP_NAME}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {t("Strength, tracked")}
            </p>
          </div>
        </div>

        <h1 className="mt-7 font-display text-[2rem] font-semibold leading-[1.1] text-foreground">
          {t("An AI trainer that adapts to your actual life")}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {t("Log sets in two taps. Get routines, diet and coaching grounded in your own history.")}
        </p>

        <div className="mt-8 rounded-3xl border border-border/60 bg-card/80 p-5 backdrop-blur-xl">
          {checkEmail ? (
            <div className="space-y-3 text-center">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {t("Check your email")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("We sent a confirmation link to {email}. Confirm it, then sign in.", {
                  email,
                })}
              </p>
              {errorBox}
              <Button
                variant="outline"
                disabled={busy}
                className="tap-target w-full"
                onClick={handleResend}
              >
                {busy ? t("Please wait…") : t("Send the email again")}
              </Button>
              <Button
                variant="ghost"
                className="tap-target w-full"
                onClick={() => {
                  setCheckEmail(false);
                  setFormError("");
                  setMode("signin");
                }}
              >
                {t("Back to sign in")}
              </Button>
            </div>
          ) : (
            <>
              {showGoogle ? (
                <>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={handleGoogle}
                    className="tap-target h-12 w-full gap-2.5 bg-foreground text-base font-semibold text-background hover:bg-foreground/90"
                  >
                    <GoogleMark />
                    {t("Continue with Google")}
                  </Button>

                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {t("or")}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              ) : null}

              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
                {(["signin", "signup"] as Mode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setFormError("");
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
                {mode === "signup" && signupDisabled ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {t("New accounts are turned off for this app right now. Ask for an invite.")}
                  </div>
                ) : null}
                {errorBox}
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("Email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
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
                <Button
                  type="submit"
                  disabled={busy || (mode === "signup" && signupDisabled)}
                  className="tap-target w-full font-semibold"
                >
                  {busy
                    ? t("Please wait…")
                    : mode === "signup"
                      ? t("Create account")
                      : t("Sign in")}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.3 7.3 0 0 1-11-3.8H1v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1a12 12 0 0 0 0 10.8L5 14.3Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
