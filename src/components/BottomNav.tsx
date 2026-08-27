import { Link } from "@tanstack/react-router";
import { Dumbbell, Home, Salad, TrendingUp, User } from "lucide-react";
import { useT } from "@/lib/i18n";

const tabs = [
  { to: "/inicio", label: "Home", icon: Home },
  { to: "/treino", label: "Train", icon: Dumbbell },
  { to: "/dieta", label: "Diet", icon: Salad },
  { to: "/progresso", label: "Progress", icon: TrendingUp },
  { to: "/perfil", label: "Profile", icon: User },
] as const;


export function BottomNav() {
  const t = useT();

  return (
    <nav className="z-40 shrink-0 border-t border-border bg-background/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="tap-target flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tracking-wide text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" strokeWidth={1.9} />
              {t(label)}
            </Link>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
