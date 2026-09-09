import { APP_NAME, pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RouteLogo } from "@/components/brand/RouteLogo";
import { StoppedRule } from "@/components/brand/Stop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Sign in",
      description: "Sign in to ROUTE. Training and nutrition adjusted to your recorded progress.",
      ogDescription: "Training that adjusts to your schedule, recovery and recorded progress.",
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

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [formError, setFormError] = useState("");

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
      const redirectTo = target
        ? `${window.location.origin}/?redirect=${encodeURIComponent(target)}`
        : window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error) {
      setBusy(false);
      const raw = error instanceof Error ? error.message : "";
      const notEnabled = /provider is not enabled|Unsupported provider|validation_failed/i.test(
        raw,
      );
      toast.error(
        notEnabled
          ? t(
              "Google sign-in isn't enabled on this Supabase project yet. Use email and password for now.",
            )
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
          options: {
            emailRedirectTo: target
              ? `${window.location.origin}/?redirect=${encodeURIComponent(target)}`
              : window.location.origin,
          },
        });
        if (error) throw error;
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
      const raw = error instanceof Error ? error.message : "";
      const code =
        typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      const emailLimitExceeded =
        /email rate limit exceeded|over_email_send_rate_limit/i.test(raw) ||
        code === "over_email_send_rate_limit";

      if (emailLimitExceeded) {
        setFormError(
          t(
            "Too many confirmation emails were requested. Please wait a few minutes before trying again.",
          ),
        );
      } else {
        toast.error(raw || t("Could not sign in"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-bone px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10 text-ink">
      <div className="grid min-h-[calc(100vh-5rem)] w-full grid-cols-12 content-between gap-x-4 lg:max-w-6xl">
        <div className="col-span-12 lg:col-span-7">
          <RouteLogo variant="stacked" />
          <StoppedRule tone="violet" weight="heavy" className="mt-10 max-w-md" />
          <h1 className="mt-8 max-w-[12ch] font-display text-display font-extrabold uppercase leading-[0.95]">
            {t("Training adjusted to your actual life")}
          </h1>
          <p className="mt-5 max-w-[52ch] text-[17px] font-light leading-relaxed text-muted-foreground">
            {t("Your training, nutrition and recovery use the progress you record.")}
          </p>
        </div>

        <div className="col-span-12 mt-12 rounded-lg bg-stone p-5 lg:col-span-5 lg:mt-0 lg:self-end">
          {checkEmail ? (
            <div className="space-y-3 text-left">
              <h2 className="font-display text-xl font-bold uppercase text-foreground">
                {t("Check your email")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("We sent a confirmation link to {email}. Confirm it, then sign in.", {
                  email,
                })}
              </p>
              <Button
                variant="outline"
                className="tap-target w-full"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
              >
                {t("Back to sign in")}
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                disabled={busy}
                onClick={handleGoogle}
                variant="outline"
                className="tap-target h-12 w-full gap-2.5"
              >
                <GoogleMark />
                {t("Continue with Google")}
              </Button>

              <StoppedRule weight="hairline" tone="ink" className="my-5" />

              <div className="mb-4 grid grid-cols-2 border-b-[3px] border-stone-line">
                {(["signin", "signup"] as Mode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setFormError("");
                    }}
                    className={cn(
                      "tap-target border-b-[6px] border-transparent px-2 font-sans text-xs font-bold uppercase tracking-[0.16em] transition-colors",
                      mode === value ? "border-violet text-violet" : "text-muted-foreground",
                    )}
                  >
                    {t(value === "signin" ? "Sign in" : "Create account")}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {formError ? (
                  <div
                    role="alert"
                    className="rounded-lg border-l-[6px] border-oxide bg-bone px-3 py-2.5 text-sm leading-relaxed text-foreground"
                  >
                    <p>{formError}</p>
                    <button
                      type="button"
                      className="mt-2 min-h-11 font-semibold text-primary"
                      onClick={() => {
                        setMode("signin");
                        setFormError("");
                      }}
                    >
                      {t("Back to sign in")}
                    </button>
                  </div>
                ) : null}
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
                <Button type="submit" disabled={busy} className="tap-target w-full font-semibold">
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
