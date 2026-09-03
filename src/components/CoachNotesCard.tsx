import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import { getCoachNotes } from "@/lib/data/coach-notes";
import { getCoachingEvents, firedToday, logCoachingEvent, replyToCoachingEvent } from "@/lib/data/coaching";
import { getWorkouts } from "@/lib/data/workouts";
import { getRoutines } from "@/lib/data/routines";
import {
  daysSinceLastWorkout,
  inactivityMessage,
  inactivityThreshold,
  proposeSession,
} from "@/lib/coach/inactivity";
import { formatDateLong } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { QueryError } from "@/components/QueryError";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CoachNoteKind, CoachingEvent } from "@/lib/types";

type Filter = "all" | "coach" | CoachNoteKind;

interface FeedItem {
  id: string;
  createdAt: string;
  label: string;
  content: string;
  tags: string[];
  adaptive: boolean;
  reply?: string | undefined;
}

/** Everything the coach and your check-ins recorded, newest first. */
export function CoachNotesCard() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<{ role: "user" | "coach"; text: string }[]>([]);
  const notesQ = useQuery({ queryKey: ["coach-notes"], queryFn: getCoachNotes });
  const eventsQ = useQuery({ queryKey: ["coaching-events"], queryFn: getCoachingEvents });
  const workoutsQ = useQuery({ queryKey: ["workouts"], queryFn: getWorkouts });
  const routinesQ = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const [checkIn, setCheckIn] = useState<CoachingEvent | null>(null);
  const createdRef = useRef(false);

  // Proactive check-in: surfaced here, without waiting for the user to open Train.
  useEffect(() => {
    if (createdRef.current) return;
    const workouts = workoutsQ.data;
    const events = eventsQ.data;
    if (!workouts || !events) return;
    const days = daysSinceLastWorkout(workouts);
    if (days == null || days < inactivityThreshold()) return;
    const existing = events.find(
      (e) => e.kind === "inactivity_checkin" && e.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
    );
    createdRef.current = true;
    if (existing) {
      setCheckIn(existing);
      return;
    }
    if (firedToday(events, "inactivity_checkin")) return;
    void logCoachingEvent({
      kind: "inactivity_checkin",
      cause: "none",
      message: inactivityMessage(days),
      detail: { days },
    }).then(setCheckIn);
  }, [workoutsQ.data, eventsQ.data]);

  const feed = useMemo<FeedItem[]>(() => {
    const notes: FeedItem[] = (notesQ.data ?? []).map((n) => ({
      id: n.id,
      createdAt: n.createdAt,
      label: n.kind === "checkin" ? t("Check-in") : t("Observation"),
      content: n.content,
      tags: n.tags,
      adaptive: false,
    }));
    const events: FeedItem[] = (eventsQ.data ?? []).map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      label:
        e.kind === "performance_drop"
          ? t("Performance")
          : e.kind === "post_workout"
            ? t("Recovery")
            : e.kind === "chat_swap"
              ? t("Exercise swap")
              : t("Check-in"),
      content: e.message,
      tags: e.cause && e.cause !== "none" ? [e.cause.replace("_", " ")] : [],
      adaptive: true,
      reply: e.userReply,
    }));
    const all = [...notes, ...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter === "all") return all;
    if (filter === "coach") return all.filter((i) => i.adaptive);
    return all.filter((i) => !i.adaptive && i.label === (filter === "checkin" ? t("Check-in") : t("Observation")));
  }, [notesQ.data, eventsQ.data, filter, t]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const proposal = proposeSession(
      text,
      routinesQ.data ?? [],
      (workoutsQ.data ?? [])[0]?.routineId,
    );
    setConversation((c) => [...c, { role: "user", text }, { role: "coach", text: proposal.text }]);
    if (checkIn) await replyToCoachingEvent(checkIn.id, text);
    await logCoachingEvent({
      kind: "inactivity_checkin",
      cause: "none",
      message: proposal.text,
      detail: { reply: text, routineId: proposal.routineId, shortened: proposal.shortened },
    });
    void eventsQ.refetch();
  }

  if (notesQ.isError) {
    return (
      <QueryError
        message={t("Could not load your coach notes.")}
        onRetry={() => void notesQ.refetch()}
      />
    );
  }
  if (!feed.length && !checkIn) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="label-caps">{t("Coach notes")}</h2>

      {checkIn ? (
        <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" /> {t("Coach")}
          </p>
          <p className="mt-1 text-sm leading-snug">{checkIn.message}</p>
          {conversation.map((m, i) => (
            <p
              key={i}
              className={cn(
                "mt-2 rounded-xl px-3 py-2 text-sm leading-snug",
                m.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-6 bg-surface-3 text-foreground",
              )}
            >
              {m.text}
            </p>
          ))}
        </div>
      ) : null}

      <form onSubmit={(e) => void sendReply(e)} className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("Tell your coach what you're up for…")}
          aria-label={t("Reply to your coach")}
        />
        <button
          type="submit"
          className="tap-target flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label={t("Send")}
        >
          <Send className="size-4" />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "coach", "checkin", "observation"] as Filter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "tap-target rounded-full border px-3 text-xs font-semibold transition-colors",
              filter === option
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {option === "all"
              ? t("All")
              : option === "coach"
                ? t("From coach")
                : option === "checkin"
                  ? t("Check-ins")
                  : t("Observations")}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-3">
        {(showAll ? feed : feed.slice(0, 5)).map((item) => (
          <li key={item.id} className="border-t border-border/60 pt-3 first:border-0 first:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={item.adaptive ? "text-primary" : undefined}>{item.label}</span> ·{" "}
              <span className="normal-case">{formatDateLong(item.createdAt)}</span>
            </p>
            <p className="mt-1 text-sm leading-snug">{item.content}</p>
            {item.reply ? (
              <p className="mt-1 text-xs italic text-muted-foreground">
                {t("You said")}: {item.reply}
              </p>
            ) : null}
            {item.tags.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {feed.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="tap-target mt-2 text-xs font-semibold text-primary"
        >
          {showAll ? t("Show less") : t("Show all {count} notes", { count: feed.length })}
        </button>
      ) : null}
      {feed.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("No notes in this filter yet.")}</p>
      ) : null}
    </section>
  );
}
