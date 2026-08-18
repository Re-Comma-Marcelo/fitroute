import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SessionMiniPlayer } from "./SessionMiniPlayer";

export function AppShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {action}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 px-2 py-2">
        {left}
        <h1 className="flex-1 truncate text-lg font-bold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  );
}