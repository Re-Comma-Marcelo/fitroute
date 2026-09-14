import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { APP_NAME, pageMeta } from "@/lib/route-meta";

/**
 * OAuth 2.1 authorization / consent endpoint for the MCP connector.
 * Supabase Auth is the authorization server; this page proves the visitor is
 * signed in and then approves/denies the authorization through the supabase-js
 * OAuth server API (auth.oauth.*).
 */
export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Connect an AI assistant",
      description: "Approve access so your AI assistant can read and update your Route data.",
    }),
  }),
  component: ConsentPage,
});

const RESUME_KEY = "ironlogger.oauth.resume";

type ClientInfo = { name: string; uri?: string };

function ConsentPage() {
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "submitting">("checking");
  const [email, setEmail] = useState("");
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [authorizationId, setAuthorizationId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const target = window.location.pathname + window.location.search;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!alive) return;
      if (!userData.user) {
        // Preserve the consent URL and send the visitor to the sign-in screen (root).
        window.sessionStorage.setItem(RESUME_KEY, target);
        navigate({ to: "/", search: { redirect: target }, replace: true });
        return;
      }
      window.sessionStorage.removeItem(RESUME_KEY);
      setEmail(userData.user.email ?? "");

      const id = new URLSearchParams(window.location.search).get("authorization_id");
      if (!id) {
        setState("ready");
        setError(
          t(
            "This link is missing the authorization_id parameter. Start the connection again from your assistant.",
          ),
        );
        return;
      }
      setAuthorizationId(id);

      try {
        const { data, error: sdkError } = await supabase.auth.oauth.getAuthorizationDetails(id);
        if (!alive) return;
        if (sdkError) {
          setState("ready");
          setError(
            t("Supabase could not load this authorization request: {message}", {
              message: sdkError.message,
            }),
          );
          return;
        }
        if (!data) {
          setState("ready");
          setError(
            t(
              "Supabase accepted the request but returned no redirect URL. Check that the OAuth server is enabled for this project.",
            ),
          );
          return;
        }
        if (!("authorization_id" in data)) {
          // Already consented before: hand control straight back to the client.
          window.location.replace(data.redirect_url);
          return;
        }
        setClient({ name: data.client?.name ?? "", uri: data.client?.uri });
        setScopes(data.scope ? data.scope.split(/\s+/).filter(Boolean) : []);
        setState("ready");
      } catch (cause) {
        if (!alive) return;
        setState("ready");
        setError(
          t("The authorization request could not be sent: {message}", {
            message: cause instanceof Error ? cause.message : String(cause),
          }),
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate, t]);

  async function decide(action: "approve" | "deny") {
    if (!authorizationId) {
      setError(
        t(
          "This link is missing the authorization_id parameter. Start the connection again from your assistant.",
        ),
      );
      return;
    }
    setState("submitting");
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        setState("ready");
        setError(
          t("Your session expired. Sign in again and reopen this page from your assistant."),
        );
        return;
      }

      const { data, error: sdkError } =
        action === "approve"
          ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
              skipBrowserRedirect: true,
            })
          : await supabase.auth.oauth.denyAuthorization(authorizationId, {
              skipBrowserRedirect: true,
            });

      if (sdkError) {
        setState("ready");
        setError(
          action === "approve"
            ? t("Supabase rejected the authorization: {message}", { message: sdkError.message })
            : t("Supabase could not register the denial: {message}", {
                message: sdkError.message,
              }),
        );
        return;
      }

      if (!data?.redirect_url) {
        setState("ready");
        setError(
          t(
            "Supabase accepted the request but returned no redirect URL. Check that the OAuth server is enabled for this project.",
          ),
        );
        return;
      }

      window.location.replace(data.redirect_url);
    } catch (cause) {
      setState("ready");
      setError(
        t("The authorization request could not be sent: {message}", {
          message: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
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
          {client?.name
            ? t("{client} wants to access your account", { client: client.name })
            : t("Connect your AI assistant")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {client?.name
            ? t(
                "{client} is requesting access to your Route data. Review the permissions below before allowing it.",
                { client: client.name },
              )
            : t(
                "Your assistant will be able to read your exercise library, profile, recent workouts and coach notes, and to create routines, meal plans and notes in your account.",
              )}
        </p>
        {client?.uri ? (
          <p className="mt-2 break-all text-xs text-muted-foreground">{client.uri}</p>
        ) : null}
        {scopes.length ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.02em] text-muted-foreground">
              {t("Requested permissions")}
            </p>
            <ul className="mt-2 space-y-1">
              {scopes.map((scope) => (
                <li key={scope} className="text-sm text-foreground">
                  {scope}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">{t("Signed in as {email}", { email })}</p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 space-y-2">
          <Button
            className="tap-target w-full font-semibold"
            disabled={state === "submitting" || !authorizationId}
            onClick={() => decide("approve")}
          >
            {state === "submitting" ? t("Please wait…") : t("Allow access")}
          </Button>
          <Button
            variant="outline"
            className="tap-target w-full"
            disabled={state === "submitting"}
            onClick={() => decide("deny")}
          >
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
