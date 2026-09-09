import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { parsePlanImport } from "@/lib/plan-ai.functions";
import type { ParsedImport } from "@/lib/plan/schema";

/** Paste notes exported from another app; nothing is committed before review. */
export function PlanImportPanel() {
  const t = useT();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const result = await parsePlanImport({ data: { raw } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setParsed(result.parsed);
    } catch {
      toast.error(t("Could not read that text. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t(
          "Paste workout notes or a history export from another app. We show what we found before saving anything.",
        )}
      </p>
      <Textarea rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} />
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={busy || raw.trim().length < 10}
        onClick={run}
      >
        {busy ? t("Reading…") : t("Read this text")}
      </Button>

      {parsed ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3 text-xs">
          <p className="font-medium">
            {t("{sessions} session(s) and {weights} weigh-in(s) found", {
              sessions: parsed.sessions.length,
              weights: parsed.bodyweights.length,
            })}
          </p>
          {parsed.sessions.slice(0, 8).map((session) => (
            <p key={`${session.date}-${session.label}`} className="text-muted-foreground">
              {session.date} · {session.label} · {session.durationMin} {t("min")}
            </p>
          ))}
          {parsed.notes.map((note) => (
            <p key={note} className="text-muted-foreground">
              {note}
            </p>
          ))}
          <p className="text-muted-foreground/80">
            {t(
              "Reviewed only for now — we use it as context for your plan, not as logged history.",
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
