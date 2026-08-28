import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { APP_NAME, pageMeta } from "@/lib/route-meta";

/**
 * OAuth 2.1 authorization / consent endpoint for the MCP connector.
 * Supabase Auth is the authorization server; this page only proves the visitor
 * is signed in and then hands control back to Supabase's authorize endpoint.
 */
export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Connect an AI assistant",
      description: "Approve access so your AI assistant can read and update your Iron Logger data.",
    }),
  }),
  component: ConsentPage,
});

const RESUME_KEY = "ironlogger.oauth.resume";

function ConsentPage() {
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "submitting">("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const target = window.location.pathname + window.location.search;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (!data.user) {
        // Preserve the consent URL and send the visitor to the sign-in screen (root).
        window.sessionStorage.setItem(RESUME_KEY, target);
        navigate({ to: "/", search: { redirect: target }, replace: true });
        return;
      }
      window.sessionStorage.removeItem(RESUME_KEY);
      setEmail(data.user.email ?? "");
      setState("ready");
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  async function approve() {
    setState("submitting");
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("no session");
      const params = new URLSearchParams(window.location.search);
      // The browser client config is injected at runtime by the root route.
      const injected = (
        window as unknown as { __FORJA_SUPABASE__?: { url?: string; key?: string } }
      ).__FORJA_SUPABASE__;
      const supabaseUrl = (
        injected?.url ?? (import.meta.env["VITE_FORJA_SUPABASE_URL"] as string | undefined) ?? ""
      )
        .replace(/\/+$/, "")
        .replace(/\/rest\/v1$/, "");
      if (!supabaseUrl) throw new Error("missing issuer");
      const response = await fetch(`${supabaseUrl}/auth/v1/oauth/authorizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(injected?.key ? { apikey: injected.key } : {}),
        },
        body: JSON.stringify({
          authorization_id: params.get("authorization_id"),
          action: "approve",
        }),
      });

      const json = (await response.json().catch(() => ({}))) as { redirect_url?: string };
      if (!response.ok || !json.redirect_url) throw new Error("authorization failed");
      window.location.replace(json.redirect_url);
    } catch {
      setState("ready");
      setError(t("We could not complete the connection. Close this window and try again."));
    }
  }

  function deny() {
    window.history.length > 1 ? window.history.back() : navigate({ to: "/inicio", replace: true });
  }

  if (state === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">{t("Please wait…")}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6">
        <h1 className="font-display text-xl font-semibold text-foreground">
          {t("Connect your AI assistant")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(
            "Your assistant will be able to read your exercise library, profile, recent workouts and coach notes, and to create routines, meal plans and notes in your account.",
          )}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("Signed in as {email}", { email })}
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 space-y-2">
          <Button
            className="tap-target w-full font-semibold"
            disabled={state === "submitting"}
            onClick={approve}
          >
            {state === "submitting" ? t("Please wait…") : t("Allow access")}
          </Button>
          <Button variant="outline" className="tap-target w-full" onClick={deny}>
            {t("Cancel")}
          </Button>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
          {APP_NAME}
        </p>
      </div>
    </main>
  );
}
