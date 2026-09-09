import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
 Outlet,
 Link,
 createRootRouteWithContext,
 useRouter,
 HeadContent,
 Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { configureSupabase, supabase } from "../integrations/supabase/client";
import { getSupabaseBrowserConfig } from "../lib/supabase-config.functions";
import { LanguageProvider, currentLangFromStorage, translate } from "../lib/i18n";
import { registerAppServiceWorker } from "../lib/pwa";
import { toast } from "sonner";

function NotFoundComponent() {
 const t = (source: string) => translate(currentLangFromStorage(), source);
 return (
 <div className="flex min-h-screen items-center justify-center bg-background px-4">
 <div className="max-w-md text-center">
 <h1 className="text-7xl font-semibold text-foreground">404</h1>
 <h2 className="mt-4 text-xl font-semibold text-foreground">{t("Page not found")}</h2>
 <p className="mt-2 text-sm text-muted-foreground">
 {t("The page you're looking for doesn't exist or has been moved.")}
 </p>
 <div className="mt-6">
 <Link
 to="/"
 className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
 >
 {t("Go home")}
 </Link>
 </div>
 </div>
 </div>
 );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
 console.error(error);
 const t = (source: string) => translate(currentLangFromStorage(), source);
 const router = useRouter();
 useEffect(() => {
 reportLovableError(error, { boundary: "tanstack_root_error_component" });
 }, [error]);

 return (
 <div className="flex min-h-screen items-center justify-center bg-background px-4">
 <div className="max-w-md text-center">
 <h1 className="text-xl font-semibold tracking-tight text-foreground">
 {t("This page didn't load")}
 </h1>
 <p className="mt-2 text-sm text-muted-foreground">
 {t("Something went wrong on our end. You can try refreshing or head back home.")}
 </p>
 <div className="mt-6 flex flex-wrap justify-center gap-2">
 <button
 onClick={() => {
 router.invalidate();
 reset();
 }}
 className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
 >
 {t("Try again")}
 </button>
 <a
 href="/"
 className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
 >
 {t("Go home")}
 </a>
 </div>
 </div>
 </div>
 );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
 loader: async () => {
 const cfg = await getSupabaseBrowserConfig();
 configureSupabase({ url: cfg.url ?? "", key: cfg.key ?? "" });
 return { supabaseConfig: { url: cfg.url ?? "", key: cfg.key ?? "" } };
 },
 head: ({ loaderData }) => ({
 // Inline script runs before the app bundle, so the browser Supabase client
 // is configured before any route gate calls supabase.auth.*.
 scripts: [
 {
 children: `window.__FORJA_SUPABASE__=${JSON.stringify(
 loaderData?.supabaseConfig ?? { url: "", key: "" },
 )};`,
 },
 ],
 meta: [
 { charSet: "utf-8" },
 { name: "viewport", content: "width=device-width, initial-scale=1" },
 { title: "ROUTE — Adaptive strength training" },
 {
 name: "description",
 content:
 "Training, nutrition and recovery adjusted to your actual schedule and recorded progress.",
 },
 { property: "og:title", content: "ROUTE — Adaptive strength training" },
 {
 property: "og:description",
 content:
 "A precise training system that adjusts to your schedule, recovery and recorded progress.",
 },
 { property: "og:type", content: "website" },
 { name: "twitter:card", content: "summary_large_image" },
 { name: "twitter:site", content: "@Lovable" },
 { name: "theme-color", content: "#EFEBE4" },
 { name: "apple-mobile-web-app-capable", content: "yes" },
 { name: "mobile-web-app-capable", content: "yes" },
 { name: "apple-mobile-web-app-status-bar-style", content: "default" },
 { name: "apple-mobile-web-app-title", content: "ROUTE" },
 ],

 links: [
 {
 rel: "stylesheet",
 href: appCss,
 },
 { rel: "preconnect", href: "https://fonts.googleapis.com" },
 { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
 {
 rel: "stylesheet",
 href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112..125,500..800&family=Chivo:wght@300;400;700&display=swap",
 },

 { rel: "manifest", href: "/manifest.webmanifest" },
 { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
 { rel: "icon", type: "image/png", href: "/favicon.png" },
 ],
 }),
 shellComponent: RootShell,
 component: RootComponent,
 notFoundComponent: NotFoundComponent,
 errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
 return (
 <html lang="en">
 <head>
 <HeadContent />
 </head>
 <body>
 {children}
 <Scripts />
 </body>
 </html>
 );
}

function RootComponent() {
 const { queryClient } = Route.useRouteContext();
 const router = useRouter();

 useEffect(() => {
 const t = (source: string) => translate(currentLangFromStorage(), source);
 registerAppServiceWorker((apply) => {
 toast(t("New version available"), {
 duration: Infinity,
 action: { label: t("Update"), onClick: apply },
 });
 });
 }, []);

 useEffect(() => {
 const {
 data: { subscription },
 } = supabase.auth.onAuthStateChange((event) => {
 if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
 router.invalidate();
 if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
 });
 return () => subscription.unsubscribe();
 }, [router, queryClient]);

 return (
 <QueryClientProvider client={queryClient}>
 <LanguageProvider>
 {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
 <Outlet />
 <Toaster position="top-center" />
 </LanguageProvider>
 </QueryClientProvider>
 );
}
