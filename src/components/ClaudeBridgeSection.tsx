import { useT } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCopy, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getExercises } from "@/lib/data/exercises";
import { getRecentCoachNotes } from "@/lib/data/coach-notes";
import { getWorkouts } from "@/lib/data/workouts";
import { getMealSchedule, activeSlots, formatSlotTime } from "@/lib/data/nutrition";
import { applyImport, previewImport, type ImportPreview } from "@/lib/data/claude-import";
import { decodeBridgeCode, type BridgePayload } from "@/lib/claude-bridge";
import type { Profile } from "@/lib/types";

const TIME_LABEL: Record<Profile["preferredTime"], string> = {
  morning: "mornings",
  midday: "middays",
  afternoon: "afternoons",
  evening: "evenings",
};

export function ClaudeBridgeSection({ profile }: { profile: Profile }) {
  const t = useT();
  const queryClient = useQueryClient();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const notesQ = useQuery({ queryKey: ["coach-notes"], queryFn: () => getRecentCoachNotes(5) });
  const workoutsQ = useQuery({ queryKey: ["workouts"], queryFn: () => getWorkouts() });
  const scheduleQ = useQuery({ queryKey: ["meal-schedule"], queryFn: getMealSchedule });

  const [raw, setRaw] = useState("");
  const [pending, setPending] = useState<{ payload: BridgePayload; preview: ImportPreview } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/mcp` : "/mcp";

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
          `- ${new Date(w.iniciadoEm).toLocaleDateString("en-US")}: ${Math.round(w.duracaoSeg / 60)} min, ${Math.round(w.volumeTotalKg)} kg total volume`,
      );
    const notes = (notesQ.data ?? []).map(
      (n) => `- ${new Date(n.createdAt).toLocaleDateString("en-US")} (${n.kind}): ${n.content}`,
    );
    const schedule = scheduleQ.data;
    const slots = schedule
      ? activeSlots(schedule).map((s) => `${s} ${formatSlotTime(schedule[s].time)}`)
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
  }, [profile, exercisesQ.data, notesQ.data, workoutsQ.data, scheduleQ.data]);

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
      toast.error(t(result.error));
      return;
    }
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
      toast.error(t("Import failed — check the code and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-primary/25 bg-primary/[0.05] p-4">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground">{t("Claude / AI assistant")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Connect Forja to your own Claude chat, ask it for a routine or a week of meals, then
            import the code it gives you back.
          </p>
        </div>
      </header>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Label className="label-caps text-muted-foreground">{t("1 · Connector URL")}</Label>
        <p className="break-all font-mono text-xs text-foreground">{mcpUrl}</p>
        <p className="text-xs text-muted-foreground">
          {t("In Claude: Settings → Connectors → Add custom connector, and paste this URL.")}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-full"
          onClick={() => copy(mcpUrl, t("Connector URL"))}
        >
          <ClipboardCopy className="mr-2 size-4" /> {t("Copy URL")}
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Label className="label-caps text-muted-foreground">{t("2 · Your training context")}</Label>
        <p className="text-xs text-muted-foreground">
          Paste this into the Claude chat first so it plans with your equipment, limits and recent
          sessions.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-full"
          onClick={() => copy(context, t("Training context"))}
        >
          <ClipboardCopy className="mr-2 size-4" /> {t("Copy my training context")}
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Label className="label-caps text-muted-foreground" htmlFor="claude-code">
          {t("3 · Import from Claude")}
        </Label>
        <Textarea
          id="claude-code"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setPending(null);
          }}
          rows={3}
          placeholder={t("Paste the FORJA1. code Claude returned…")}
          className="text-xs"
        />
        {pending ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/[0.06] p-3">
            <p className="text-sm font-bold text-foreground">{pending.preview.title}</p>
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
              <Button type="button" className="h-10 flex-1" disabled={busy} onClick={confirm}>
                <Check className="mr-2 size-4" /> {t("Apply")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-10"
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
            className="h-10 w-full"
            disabled={!raw.trim()}
            onClick={check}
          >
            <Download className="mr-2 size-4" /> {t("Preview import")}
          </Button>
        )}
      </div>
    </section>
  );
}
