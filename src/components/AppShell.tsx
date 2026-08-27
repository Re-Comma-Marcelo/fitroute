import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { SessionMiniPlayer } from "./SessionMiniPlayer";
import { useLanguageSync } from "@/lib/i18n/use-language-sync";


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
  return (
    <div className="min-h-screen bg-background pb-[calc(10rem+env(safe-area-inset-bottom))]">
      {hideHeader ? null : (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-5">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {action}
          </div>
        </header>
      )}
      <main
        key={pathname}
        className={`route-enter mx-auto max-w-md px-4 pb-4 ${hideHeader ? "pt-6" : "pt-2"}`}
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