import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronUp, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDuration } from "@/lib/format";
import {
  clearActiveSession,
  currentExerciseName,
  loadActiveSession,
  restSecondsLeft,
  saveActiveSession,
  sessionElapsed,
  type ActiveSession,
  type RestState,
  sessionLabel,
} from "@/lib/session-state";
import { useT } from "@/lib/i18n";
import { ProgressRing } from "@/components/ProgressRing";
import { RestIsland } from "@/components/RestIsland";
import { sessionSetsDone } from "@/lib/session-state";
import { isSerieValida } from "@/lib/progression";
import { useRestExpiry } from "@/lib/use-rest-expiry";
import { cancelRestNotification, scheduleRestNotification } from "@/lib/rest-notification";

/**
 * Floating session island shown above the bottom nav on every tab.
 * Lets you navigate the app without losing your workout, and keeps the rest
 * countdown (with -15s / +15s / skip) reachable from anywhere.
 */

export function SessionMiniPlayer() {
  const navigate = useNavigate();
  const t = useT();
  const location = useLocation();
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(loadActiveSession());
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, []);

  /**
   * The session screen owns rest feedback while it is open; everywhere else the
   * mini-player clears the countdown (with sound + vibration) so it never gets
   * stuck at 0:00 just because you switched tabs.
   */
  const onSessionScreen = location.pathname.startsWith("/sessao");
  const clearRest = useCallback(() => {
    const current = loadActiveSession();
    if (!current?.rest) return;
    const next = { ...current, rest: null };
    saveActiveSession(next);
    cancelRestNotification();
    setSession(next);
  }, []);
  useRestExpiry(session?.rest?.endsAt ?? null, clearRest, !onSessionScreen);

  const patchRest = useCallback((mutate: (r: RestState) => RestState | null) => {
    const current = loadActiveSession();
    if (!current?.rest) return;
    const rest = mutate(current.rest);
    if (!rest) cancelRestNotification();
    else
      scheduleRestNotification(
        Math.max(0, rest.endsAt - Date.now()),
        t("Rest is over"),
        t("Time for your next set."),
      );
    const next = { ...current, rest };
    saveActiveSession(next);
    setSession(next);
  }, [t]);

  if (!session) return null;

  const restLeft = restSecondsLeft(session);
  const setsDone = sessionSetsDone(session);
  const setsTotal = session.exercicios
    .filter((ex) => !ex.pulado)
    .reduce((total, ex) => total + ex.sets.filter(isSerieValida).length, 0);

  return (
    <div className="z-40 shrink-0 space-y-2 px-3 pb-2">
      {/* Rest island: only outside the session screen, which shows its own. */}
      {!onSessionScreen && session.rest && restLeft > 0 ? (
        <RestIsland
          total={session.rest.total}
          left={restLeft}
          onAdd={() => patchRest((r) => ({ total: r.total + 15, endsAt: r.endsAt + 15000 }))}
          onSubtract={() => patchRest((r) => ({ ...r, endsAt: r.endsAt - 15000 }))}
          onSkip={() => patchRest(() => null)}
        />
      ) : null}

      <div className="mx-auto flex max-w-md items-center gap-1 rounded-full border border-primary/30 bg-card/90 py-1.5 pl-2 pr-1.5 shadow-2xl backdrop-blur-xl">
        <Link
          to="/sessao"
          aria-label={t("Return to workout session")}
          className="tap-target flex min-w-0 flex-1 items-center gap-2 rounded-full px-1 text-left"
        >
          <ChevronUp className="size-5 shrink-0 text-primary" />
          <ProgressRing
            done={setsDone}
            total={setsTotal}
            size={20}
            stroke={2.5}
            showLabel={false}
          />
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{sessionLabel(session)}</span>
              <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-primary">
                {formatDuration(sessionElapsed(session))}
              </span>
            </span>
            <span className="block truncate text-xs text-muted-foreground/80">
              {currentExerciseName(session)}
            </span>
          </span>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label={t("Discard active workout")}
              className="tap-target flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <Trash2 className="size-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Discard this workout?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("Sets logged for {routineNome} will be lost. This cannot be undone.", {
                  routineNome: sessionLabel(session),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="tap-target">{t("Keep training")}</AlertDialogCancel>
              <AlertDialogAction
                className="tap-target bg-destructive text-destructive-foreground"
                onClick={() => {
                  clearActiveSession();
                  setSession(null);
                  navigate({ to: "/treino" });
                }}
              >
                {t("Discard")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
