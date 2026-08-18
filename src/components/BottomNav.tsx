import { Link } from "@tanstack/react-router";
import { Dumbbell, Salad, TrendingUp, User } from "lucide-react";

const tabs = [
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/dieta", label: "Dieta", icon: Salad },
  { to: "/progresso", label: "Progresso", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="tap-target flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-6" strokeWidth={2.2} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}