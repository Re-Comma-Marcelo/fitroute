import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/rota")({
  component: RouteLayout,
});

/** Shared shell for the route page: the Route tab and the Progress tab. */
function RouteLayout() {
  const t = useT();
  return (
    <AppShell title={t("My route")}>
      <nav className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        <Tab to="/rota" label={t("Route")} />
        <Tab to="/rota/progresso" label={t("Progress")} />
      </nav>
      <Outlet />
    </AppShell>
  );
}

function Tab({ to, label }: { to: "/rota" | "/rota/progresso"; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="tap-target rounded-full py-2 text-center text-xs font-semibold text-muted-foreground transition-colors"
      activeProps={{ className: "bg-primary/15 text-primary" }}
    >
      {label}
    </Link>
  );
}
