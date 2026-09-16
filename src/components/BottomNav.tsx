import { Link } from "@tanstack/react-router";
import { Dumbbell, Home, Map, Salad, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/inicio", label: "Home", icon: Home, accent: "" },
  { to: "/treino", label: "Train", icon: Dumbbell, accent: "text-train" },
  { to: "/dieta", label: "Diet", icon: Salad, accent: "text-diet" },
  { to: "/rota", label: "Route", icon: Map, accent: "text-primary" },
  { to: "/perfil", label: "Profile", icon: User, accent: "" },
] as const;

export function BottomNav() {
  const t = useT();

  return (
    <nav className="z-40 shrink-0 px-4 pb-3 pt-1">
      <ul className="mx-auto flex max-w-md items-center rounded-full border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">
        {tabs.map(({ to, label, icon: Icon, accent }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="tap-target flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium tracking-wide text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <Icon
                    className={cn("size-5", !isActive && accent ? accent : undefined)}
                    strokeWidth={1.9}
                  />
                  {t(label)}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
