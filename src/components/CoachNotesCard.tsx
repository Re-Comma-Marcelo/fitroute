import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoachNotes } from "@/lib/data/coach-notes";
import { formatDateLong } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { QueryError } from "@/components/QueryError";
import { cn } from "@/lib/utils";
import type { CoachNoteKind } from "@/lib/types";

type Filter = "all" | CoachNoteKind;

/** Everything the coach and your check-ins recorded, newest first. */
export function CoachNotesCard() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const notesQ = useQuery({ queryKey: ["coach-notes"], queryFn: getCoachNotes });

  const notes = useMemo(() => {
    const list = [...(notesQ.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filter === "all" ? list : list.filter((n) => n.kind === filter);
  }, [notesQ.data, filter]);


  if (notesQ.isError) {
    return (
      <QueryError
        message={t("Could not load your coach notes.")}
        onRetry={() => void notesQ.refetch()}
      />
    );
  }
  if (!notesQ.data?.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="label-caps">{t("Coach notes")}</h2>
      <div className="mt-2 flex gap-2">
        {(["all", "checkin", "observation"] as Filter[]).map((option) => (
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
              : option === "checkin"
                ? t("Check-ins")
                : t("Observations")}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-3">
        {(showAll ? notes : notes.slice(0, 5)).map((note) => (
          <li key={note.id} className="border-t border-border/60 pt-3 first:border-0 first:pt-0">

            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {note.kind === "checkin" ? t("Check-in") : t("Observation")} ·{" "}
              <span className="normal-case">{formatDateLong(note.createdAt)}</span>
            </p>
            <p className="mt-1 text-sm leading-snug">{note.content}</p>
            {note.tags.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
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
      {notes.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="tap-target mt-2 text-xs font-semibold text-primary"
        >
          {showAll ? t("Show less") : t("Show all {count} notes", { count: notes.length })}
        </button>
      ) : null}
      {notes.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("No notes in this filter yet.")}</p>
      ) : null}

    </section>
  );
}
