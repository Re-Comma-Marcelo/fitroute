import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  sessionElapsed,
  type ActiveSession,
  sessionLabel,
} from "@/lib/session-state";
import { useT } from "@/lib/i18n";

/**
 * Floating session bar shown above the bottom nav on every tab.
 * Lets you navigate the app without losing your workout.
 */

export function SessionMiniPlayer() {
  const navigate = useNavigate();
  const t = useT();
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(loadActiveSession());
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return null;

  const restLeft = restSecondsLeft(session);

  return (
    <div className="z-40 shrink-0 px-3 pb-2">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-primary/30 bg-card/90 p-2 backdrop-blur-xl">
        <Link
          to="/sessao"
          aria-label={t("Return to workout session")}
          className="tap-target flex flex-1 items-center gap-2 rounded-lg px-1 text-left"
        >
          <ChevronUp className="size-5 shrink-0 text-primary" />
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
              {restLeft > 0 ? (
                <>
                  <span className="font-mono font-semibold tabular-nums text-primary">
                    {t("Rest")} {formatDuration(restLeft)}
                  </span>
                  {" · "}
                </>
              ) : null}
              {currentExerciseName(session)}
            </span>
          </span>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label={t("Discard active workout")}
              className="tap-target flex size-11 shrink-0 items-center justify-center rounded-lg text-destructive"
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
              <AlertDialogCancel className="tap-target">
                {t("Keep training")}
              </AlertDialogCancel>
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
