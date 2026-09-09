import { Link } from "@tanstack/react-router";
import { Dumbbell, Home, Map, Salad, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { BrandIcon } from "@/components/brand/BrandIcon";

const tabs = [
  { to: "/inicio", label: "Home", icon: Home },
  { to: "/treino", label: "Train", icon: Dumbbell },
  { to: "/dieta", label: "Diet", icon: Salad },
  { to: "/rota", label: "Route", icon: Map },
  { to: "/perfil", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const t = useT();

  return (
    <nav className="z-40 shrink-0 border-t-[3px] border-stone-line bg-bone">
      <ul className="flex w-full lg:max-w-6xl">
        {tabs.map(({ to, label, icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="tap-target flex flex-col items-center justify-center gap-1 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors"
              activeProps={{ className: "border-t-[6px] border-violet text-violet" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <BrandIcon
                    icon={icon}
                    size="sm"
                    stopped={isActive}
                    className={isActive ? "text-violet" : undefined}
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
