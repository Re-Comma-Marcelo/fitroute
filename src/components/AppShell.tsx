import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { PendingSync } from "./PendingSync";
import { SessionMiniPlayer } from "./SessionMiniPlayer";
import { useLanguageSync } from "@/lib/i18n/use-language-sync";
import { useQuery } from "@tanstack/react-query";
import { getRoutines } from "@/lib/data/routines";
import { armReminder, armWeeklyCheckInReminder } from "@/lib/workout-reminder";
import { checkInDue } from "@/lib/coach/weekly-checkin";
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

  // Weekend nudge to plan the coming week (same reminder time).
  useEffect(() => {
    return armWeeklyCheckInReminder(
      checkInDue(),
      t("Time to plan your week — two minutes and you're set."),
    );
  }, [t]);

  /**
   * Replay the entry animation on route change without remounting the tree —
   * keying <main> by pathname threw away children state (accordions, filters,
   * scroll position) on every navigation.
   */
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
        <header className="z-30 shrink-0 bg-background">
          <div className="grid w-full grid-cols-[minmax(0,7fr)_3fr_2fr] items-start gap-3 px-6 pb-4 pt-6 lg:max-w-6xl">
            <h1 className="col-span-1 truncate font-display text-title font-bold uppercase">
              {title}
            </h1>
            {action}
          </div>
        </header>
      )}
      <PendingSync />
      <main
        ref={mainRef}
        className={`route-enter w-full flex-1 overflow-y-auto px-6 pb-6 lg:max-w-6xl ${hideHeader ? "pt-6" : "pt-2"}`}
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
    <header className="sticky top-0 z-30 border-b-[3px] border-stone-line bg-background">
      <div className="flex w-full items-center gap-2 px-6 py-3 lg:max-w-6xl">
        {left}
        <h1 className="flex-1 truncate font-display text-xl font-bold uppercase">{title}</h1>
        {right}
      </div>
    </header>
  );
}
