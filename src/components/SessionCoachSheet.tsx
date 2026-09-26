import { useEffect, useRef, useState } from "react";
import { ChevronRight, MessageSquare, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { tx } from "@/lib/format";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { saveCoachChat } from "@/lib/data/coaching";
import { saveCoachNote } from "@/lib/data/coach-notes";
import { getExerciseUsage } from "@/lib/exercise-usage";
import { detectSwapIntent, rankSwapCandidates } from "@/lib/coach/swap";
import { getPastSwaps } from "@/lib/data/folders";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { exerciseThumbUrl } from "@/lib/exerciseMedia";
import type { Exercise } from "@/lib/types";

interface Msg {
  role: "user" | "coach";
  text: string;
  swap?: Exercise[];
  /** Label above the swap cards ("Easier variants" vs "Same muscle"). */
  swapTitle?: string;
  /** Extra coaching lines (execution steps) shown before the cards. */
  steps?: string[];
}

const FEEL_HINTS = [
  "feel",
  "where",
  "form",
  "technique",
  "sentir",
  "onde",
  "técnica",
  "voelen",
  "waar",
  "techniek",
];

/**
 * Coach chat during an active workout: swap the current exercise, form cues,
 * short answers only.
 */
export function SessionCoachSheet({
  exerciseId,
  exerciseName,
  sessionExerciseIds,
  workoutId,
  onSwap,
  onMoreOptions,
  compact = false,
}: {
  exerciseId: string;
  exerciseName: string;
  sessionExerciseIds: string[];
  workoutId: string;
  onSwap: (exercise: Exercise) => void;
  /** Opens the full replace picker (search + all alternatives). */
  onMoreOptions?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessages([
      {
        role: "coach",
        text: tx("{exercise} — what do you need? A swap, or where you should feel it?", {
          exercise: exerciseName,
        }),
      },
    ]);
  }, [open, exerciseName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function answer(question: string): Promise<Msg> {
    const q = question.toLowerCase();
    const [exercises, profile, pastSwapIds] = await Promise.all([
      getExercises(),
      getProfile(),
      getPastSwaps(exerciseId).catch(() => [] as string[]),
    ]);
    const target = exercises.find((e) => e.id === exerciseId);
    const intent = detectSwapIntent(q);
    const rank = (reason: ReturnType<typeof detectSwapIntent>["reason"], limit: number) =>
      rankSwapCandidates(exerciseId, exercises, {
        profile,
        excludeIds: sessionExerciseIds,
        historyIds: Object.keys(getExerciseUsage() as Record<string, number>),
        pastSwapIds,
        reason,
        limit,
      });

    // "I can't do this one right": prepare the body, then an easier variant.
    if (intent.difficulty && target) {
      void saveCoachNote({
        kind: "observation",
        content: tx("Found {exercise} hard: {note}", { exercise: target.nome, note: question }),
        tags: ["difficulty", "issue"],
      }).catch(() => {});
      const easier = rank("difficulty", 3);
      const steps = [
        target.instrucoes?.trim() || "",
        tx(
          "Drop the load by about 30% and do 2 slow sets of 8 — learn the groove before you chase weight.",
        ),
        tx("Brace before you move and stop the rep where the form starts to change."),
      ].filter(Boolean);
      return {
        role: "coach",
        text: tx(
          "Fair enough. Here is how to prepare, and easier variants that train the same muscle.",
        ),
        steps,
        swap: easier,
        swapTitle: tx("Easier variants"),
      };
    }

    if (intent.swap && target) {
      const candidates = rank(intent.reason, 3);
      if (!candidates.length) {
        return {
          role: "coach",
          text: tx(
            "Nothing on file that hits {group} with your equipment. Cut the range short and keep the load light instead.",
            { group: target.grupoPrimario },
          ),
        };
      }
      const text =
        intent.reason === "busy"
          ? tx(
              "Machine taken? These hit the same muscle with other equipment. Pick one and I swap it in.",
            )
          : intent.reason === "pain"
            ? tx("Same muscle, easier on that complaint. Pick one and I'll swap it in now.")
            : tx("Same muscle, pick one and I swap it in now.");
      return { role: "coach", text, swap: candidates, swapTitle: tx("Same muscle") };
    }

    if (FEEL_HINTS.some((h) => q.includes(h)) && target) {
      return {
        role: "coach",
        text:
          target.instrucoes?.trim() ||
          tx("You should feel it in {group}. Slow the way down and keep the joint stacked.", {
            group: target.grupoPrimario,
          }),
      };
    }

    return {
      role: "coach",
      text: tx(
        "Keep the set quality high: control the way down, stop one rep before form breaks. Ask me for a swap if something hurts.",
      ),
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    const reply = await answer(question);
    setMessages((m) => [...m, reply]);
    setBusy(false);
    void saveCoachChat({ role: "user", content: question, workoutId, exerciseId });
    void saveCoachChat({ role: "coach", content: reply.text, workoutId, exerciseId });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={
            compact
              ? "grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
              : "tap-target inline-flex h-8 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-[11px] font-semibold text-primary"
          }
          aria-label={t("Ask your coach")}
          title={t("Ask your coach")}
        >
          <MessageSquare className={compact ? "size-4" : "size-3.5"} strokeWidth={2} />
          {compact ? null : t("Ask coach")}
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" /> {t("Coach")}
          </SheetTitle>
        </SheetHeader>
        <div className="flex h-[60vh] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto py-2 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.steps?.length ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
                      {m.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                  {m.swap?.length ? (
                    <div className="mt-2 space-y-1.5">
                      {m.swapTitle ? (
                        <p className="label-caps text-[10px] text-muted-foreground">
                          {m.swapTitle}
                        </p>
                      ) : null}
                      {m.swap.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          className="tap-target flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2 text-left"
                          onClick={() => {
                            onSwap(candidate);
                            setOpen(false);
                          }}
                        >
                          <ExerciseThumb
                            grupo={candidate.grupoPrimario}
                            nome={candidate.nome}
                            src={exerciseThumbUrl(candidate)}
                            className="size-9"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">
                              {candidate.nome}
                            </span>
                            <span className="block truncate text-[11px] capitalize text-muted-foreground">
                              {candidate.grupoPrimario} · {candidate.equipamento}
                            </span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                      {onMoreOptions ? (
                        <Button
                          variant="ghost"
                          className="h-9 w-full text-xs font-semibold text-primary"
                          onClick={() => {
                            setOpen(false);
                            onMoreOptions();
                          }}
                        >
                          {t("More options")}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => void submit(e)} className="flex gap-2 pb-4 pt-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Ask something...")}
              aria-label={t("Ask your coach")}
            />
            <button
              type="submit"
              className="tap-target flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label={t("Send")}
              disabled={busy}
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
