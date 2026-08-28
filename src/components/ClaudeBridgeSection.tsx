import { useT } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCopy,
  Download,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getExercises } from "@/lib/data/exercises";
import { getRecentCoachNotes } from "@/lib/data/coach-notes";
import { getWorkouts } from "@/lib/data/workouts";
import { getMealSchedule, activeSlots, formatSlotTime, SLOT_LABEL } from "@/lib/data/nutrition";
import { formatDateNumeric } from "@/lib/format";
import { applyImport, previewImport, type ImportPreview } from "@/lib/data/claude-import";
import { decodeBridgeCode, type BridgePayload } from "@/lib/claude-bridge";
import { resolveConnectorTarget } from "@/lib/claude-connect";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const TIME_LABEL: Record<Profile["preferredTime"], string> = {
  morning: "mornings",
  midday: "middays",
  afternoon: "afternoons",
  evening: "evenings",
};

const DONE_KEY = "forja.claude.steps";
const EXAMPLE_PROMPT =
  "Use the Iron Logger tools: read my training context and build a 45-minute upper-body routine using dumbbells and a barbell.";

function useStepsDone() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DONE_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, []);
  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(DONE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }
  return { done, toggle };
}

function Step({
  n,
  title,
  done,
  onToggle,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border p-3 transition-colors",
        done ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check className="size-3.5" /> : n}
        </span>
        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">{title}</p>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={done}
            className="-my-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
          >
            <Check className={cn("size-4", done && "text-primary")} />
          </button>
        ) : null}
      </div>
      <div className="space-y-2 pl-8">{children}</div>
    </div>
  );
}

export function ClaudeBridgeSection({ profile }: { profile: Profile }) {
  const t = useT();
  const queryClient = useQueryClient();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const notesQ = useQuery({ queryKey: ["coach-notes"], queryFn: () => getRecentCoachNotes(5) });
  const workoutsQ = useQuery({ queryKey: ["workouts"], queryFn: () => getWorkouts() });
  const scheduleQ = useQuery({ queryKey: ["meal-schedule"], queryFn: getMealSchedule });

  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ payload: BridgePayload; preview: ImportPreview } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const { done, toggle } = useStepsDone();

  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const target = useMemo(() => resolveConnectorTarget(origin), [origin]);

  const context = useMemo(() => {
    const exercises = exercisesQ.data ?? [];
    const avoid = profile.avoidExercises
      .map((a) => {
        const ex = exercises.find((e) => e.id === a.exerciseId);
        return ex ? `${ex.nome}${a.reason ? ` (${a.reason})` : ""}` : null;
      })
      .filter(Boolean);
    const recent = (workoutsQ.data ?? [])
      .filter((w) => w.finalizadoEm)
      .slice(0, 5)
      .map(
        (w) =>
          `- ${formatDateNumeric(w.iniciadoEm)}: ${Math.round(w.duracaoSeg / 60)} min, ${Math.round(w.volumeTotalKg)} kg total volume`,
      );
    const notes = (notesQ.data ?? []).map(
      (n) => `- ${formatDateNumeric(n.createdAt)} (${n.kind}): ${n.content}`,
    );
    const schedule = scheduleQ.data;
    const slots = schedule
      ? activeSlots(schedule).map((s) => `${t(SLOT_LABEL[s])} ${formatSlotTime(schedule[s].time)}`)
      : [];

    return [
      "Here is my Forja training context. Use the Forja MCP tools to plan for me.",
      "",
      "## Me",
      `- Name: ${profile.nome}`,
      `- Bodyweight: ${profile.pesoKg} kg, height: ${profile.alturaCm} cm`,
      `- Goal: ${profile.objetivo}, activity level: ${profile.nivelAtividade}`,
      profile.pesoMetaKg ? `- Target bodyweight: ${profile.pesoMetaKg} kg` : "",
      "",
      "## Training setup",
      `- Weekly session target: ${profile.metaTreinosSemana}`,
      `- Session length: about ${profile.sessionLengthMin} min, usually ${t(TIME_LABEL[profile.preferredTime])}`,
      `- Equipment available: ${profile.equipment.length ? profile.equipment.join(", ") : "not set"}`,
      `- Exercises to avoid: ${avoid.length ? avoid.join("; ") : "none"}`,
      "",
      "## Meal times",
      slots.length ? `- ${slots.join(", ")}` : "- not set",
      "",
      "## Recent sessions",
      recent.length ? recent.join("\n") : "- none logged yet",
      "",
      "## Notes I logged",
      notes.length ? notes.join("\n") : "- none",
    ]
      .filter((l) => l !== "")
      .join("\n");
  }, [t, profile, exercisesQ.data, notesQ.data, workoutsQ.data, scheduleQ.data]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("{label} copied", { label }));
    } catch {
      toast.error(t("Could not copy — select the text manually."));
    }
  }

  function check() {
    const result = decodeBridgeCode(raw);
    if (!result.ok) {
      setError(
        raw.trim().includes("FORJA1.")
          ? t(result.error)
          : t("That does not look like a Forja code — copy the whole block Claude returned, including the part that starts with FORJA1."),
      );
      setPending(null);
      return;
    }
    setError(null);
    setPending({ payload: result.payload, preview: previewImport(result.payload) });
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      const message = await applyImport(pending.payload);
      await queryClient.invalidateQueries();
      toast.success(message);
      setPending(null);
      setRaw("");
    } catch {
      setError(t("Import failed — check the code and try again."));
    } finally {
      setBusy(false);
    }
  }

  const tools = [
    t("read the app's exercise and meal libraries"),
    t("build a workout routine"),
    t("plan a week of meals"),
    t("log an observation for your coach"),
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-primary/25 bg-primary/[0.05] p-4">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t("Claude / AI assistant")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t(
              "Connect Forja to your own Claude chat, ask it for a routine or a week of meals, then import the code it gives you back.",
            )}
          </p>
        </div>
      </header>

      <div className="space-y-1.5 rounded-xl border border-border bg-card p-3">
        <p className="label-caps text-muted-foreground">{t("What Claude gets")}</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {tools.map((label) => (
            <li key={label} className="flex gap-2">
              <span aria-hidden className="text-primary">
                •
              </span>
              <span className="min-w-0 break-words">{label}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs font-semibold text-foreground">
          {t("All four only read — none of them writes into the app on its own.")}
        </p>
      </div>

      <Step n={1} title={t("1 · Copy the address")} done={!!done["url"]} onToggle={() => toggle("url")}>
        {target.url && target.unreachable ? (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="min-w-0 text-xs leading-relaxed text-foreground">
              {t(
                "You are on the editor preview. Use the URL below — it points to the published app.",
              )}
            </p>
          </div>
        ) : null}
        {target.url ? (
          <>
            <p className="break-all font-mono text-xs text-foreground">{target.url}</p>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => copy(target.url!, t("Connector URL"))}
            >
              <ClipboardCopy className="mr-2 size-4" /> {t("Copy URL")}
            </Button>
          </>
        ) : target.unreachable ? (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="min-w-0 text-xs leading-relaxed text-foreground">
              {t(
                "You are on the editor preview. Claude cannot reach this address. Publish the app, open this screen on the published address, and the connector URL will appear here to copy.",
              )}
            </p>
          </div>
        ) : null}
      </Step>


      <Step
        n={2}
        title={t("2 · Add it in Claude")}
        done={!!done["add"]}
        onToggle={() => toggle("add")}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            'Customize → Connectors → "+" → Add custom connector → paste the URL → Add. You only do this once, and it works in Claude web, desktop and Cowork.',
          )}
        </p>
      </Step>

      <Step
        n={3}
        title={t("3 · Turn it on in the chat")}
        done={!!done["enable"]}
        onToggle={() => toggle("enable")}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            'In every new conversation you have to switch the connector on: the "+" button in the message box → Connectors → enable it. This is the step people forget.',
          )}
        </p>
      </Step>

      <Step
        n={4}
        title={t("4 · Test it")}
        done={!!done["test"]}
        onToggle={() => toggle("test")}
      >
        <p className="rounded-lg border border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground">
          {t(EXAMPLE_PROMPT)}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full"
          onClick={() => copy(t(EXAMPLE_PROMPT), t("Example question"))}
        >
          <ClipboardCopy className="mr-2 size-4" /> {t("Copy the example")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("If the answer contains a code starting with FORJA1., it worked.")}
        </p>
      </Step>

      <Step n={5} title={t("5 · Import it back")} done={!!done["import"]}>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("Nothing enters the app until you confirm — the tools only read and hand back a code.")}
        </p>
        <Label className="sr-only" htmlFor="claude-code">
          {t("5 · Import it back")}
        </Label>
        <Textarea
          id="claude-code"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setPending(null);
            setError(null);
          }}
          rows={3}
          placeholder={t("Paste the FORJA1. code Claude returned…")}
          aria-invalid={!!error}
          className="text-xs"
        />
        {error ? (
          <p className="text-xs font-semibold leading-relaxed text-destructive">{error}</p>
        ) : null}
        {pending ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/[0.06] p-3">
            <p className="text-sm font-semibold text-foreground">{pending.preview.title}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {pending.preview.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            {pending.preview.warnings.map((w, i) => (
              <p key={i} className="text-xs font-semibold text-destructive">
                {w}
              </p>
            ))}
            <div className="flex gap-2">
              <Button type="button" className="h-11 flex-1" disabled={busy} onClick={confirm}>
                <Check className="mr-2 size-4" /> {t("Apply")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11"
                onClick={() => setPending(null)}
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full"
            disabled={!raw.trim()}
            onClick={check}
          >
            <Download className="mr-2 size-4" /> {t("Preview import")}
          </Button>
        )}
      </Step>

      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => setShowContext((v) => !v)}
          aria-expanded={showContext}
        >
          <span className="min-w-0 text-xs font-semibold text-foreground">
            {t("Optional · your training context")}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              showContext && "rotate-180",
            )}
          />
        </button>
        {showContext ? (
          <div className="space-y-2 border-t border-border p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(
                "Optional — while the tools cannot read your data straight from the app, paste this into the chat so Claude plans with your equipment, your limits and your latest sessions.",
              )}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => copy(context, t("Training context"))}
            >
              <ClipboardCopy className="mr-2 size-4" /> {t("Copy my training context")}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
