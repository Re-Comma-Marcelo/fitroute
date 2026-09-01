import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { PendingSync } from "./PendingSync";
import { SessionMiniPlayer } from "./SessionMiniPlayer";
import { useLanguageSync } from "@/lib/i18n/use-language-sync";
import { useQuery } from "@tanstack/react-query";
import { getRoutines } from "@/lib/data/routines";
import { armReminder } from "@/lib/workout-reminder";
import { useT } from "@/lib/i18n";

export function AppShell({
  title,
  action,
  hideHeader = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  hideHeader?: boolean;
  children: ReactNode;
}) {
  useLanguageSync();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  /**
   * Replay the entry animation on route change without remounting the tree —
   * keying <main> by pathname threw away children state (accordions, filters,
   * scroll position) on every navigation.
   */
  const t = useT();
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: getRoutines });

  // Local reminder for planned training days; re-armed whenever routines load.
  useEffect(() => {
    const routines = routinesQuery.data;
    if (!routines) return;
    return armReminder(routines, (routine) =>
      t("Time to train — {routine} is planned for today.", { routine }),
    );
  }, [routinesQuery.data, t]);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    node.classList.remove("route-enter");
    // Force a reflow so the animation restarts.
    void node.offsetWidth;
    node.classList.add("route-enter");
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {hideHeader ? null : (
        <header className="z-30 shrink-0 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {action}
          </div>
        </header>
      )}
      <PendingSync />
      <main
        ref={mainRef}
        className={`route-enter mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-6 ${hideHeader ? "pt-6" : "pt-2"}`}
      >
        {children}
      </main>
      <SessionMiniPlayer />
      <BottomNav />
    </div>
  );
}

export function PageHeader({
  title,
  left,
  right,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-2 px-2 py-2">
        {left}
        <h1 className="flex-1 truncate text-lg font-semibold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  );
}
