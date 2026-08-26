import { pageMeta } from "@/lib/route-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import heroLogin from "@/assets/hero-login.jpg";
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
      description: "Sign in to Iron Logger to log sets in two taps, follow adaptive routines and track real strength progress.",
      ogDescription: "Your AI trainer that adapts to your actual life. Sign in with Google or email.",
    }),
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive && data.user) navigate({ to: "/inicio", replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setBusy(false);
      const raw = error instanceof Error ? error.message : "";
      const notEnabled = /provider is not enabled|Unsupported provider|validation_failed/i.test(raw);
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
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
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
      navigate({ to: "/inicio", replace: true });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
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
    <main className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-background">
      <img
        src={heroLogin}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />

      <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-10 pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Forja</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground">
          {t("An AI trainer that adapts to your actual life")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Log sets in two taps. Get routines, diet and coaching grounded in your own history.")}
        </p>

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur">
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
                variant="outline"
                disabled={busy}
                onClick={handleGoogle}
                className="tap-target w-full gap-2 text-sm font-semibold"
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

              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted/40 p-1">
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
                      mode === value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground",
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
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-foreground"
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
