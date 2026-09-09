import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dieta")({
  component: DietLayout,
});

function DietLayout() {
  const t = useT();
  const modes = [
    { to: "/dieta", label: t("Today") },
    { to: "/dieta/week", label: t("Week") },
    { to: "/dieta/market", label: t("Market") },
  ] as const;

  return (
    <AppShell title={t("Nutrition")}>
      <nav className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1">
        {modes.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-primary text-primary-foreground" }}
            className="tap-target flex items-center justify-center rounded-lg text-xs font-semibold text-muted-foreground transition-colors"
          >
            {m.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        <Outlet />
      </div>
    </AppShell>
  );
}
