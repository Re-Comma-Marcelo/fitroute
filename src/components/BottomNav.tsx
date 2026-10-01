import { Link } from "@tanstack/react-router";
import { Dumbbell, Home, Map, Salad, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/inicio", label: "Home", icon: Home },
  { to: "/treino", label: "Train", icon: Dumbbell },
  { to: "/dieta", label: "Diet", icon: Salad },
  { to: "/rota", label: "Route", icon: Map },
  { to: "/perfil", label: "Profile", icon: User },
] as const;

/** 82px frosted tab bar. Active tab turquoise, the rest inactive grey. */
export function BottomNav() {
  const t = useT();

  return (
    <nav className="nav-surface z-40 h-nav shrink-0 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex h-full max-w-md items-center">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="tap-target flex flex-col items-center justify-center gap-1 font-label text-micro font-medium uppercase tracking-[var(--tracking-label)] transition-colors"
            >
              {({ isActive }: { isActive: boolean }) => (
                <span
                  className={cn(
                    "flex flex-col items-center gap-1",
                    isActive ? "text-fj-accent" : "text-fj-inactive",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.9} />
                  {t(label)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
