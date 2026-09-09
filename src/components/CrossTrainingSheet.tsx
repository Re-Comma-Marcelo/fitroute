import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { saveCrossTraining } from "@/lib/data/coaching";
import type { CrossTrainingKind } from "@/lib/types";

const KINDS: CrossTrainingKind[] = ["run", "sport", "bike", "walk", "other"];

/** Quick log for non-lifting activity, so the coach can explain strength dips. */
export function CrossTrainingSheet({ className }: { className?: string }) {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CrossTrainingKind>("run");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [minutes, setMinutes] = useState("40");
  const [intensity, setIntensity] = useState<"easy" | "moderate" | "hard">("moderate");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const label = (k: CrossTrainingKind) =>
    k === "run"
      ? t("Run")
      : k === "sport"
        ? t("Sport")
        : k === "bike"
          ? t("Bike")
          : k === "walk"
            ? t("Walk")
            : t("Other");

  async function submit() {
    setSaving(true);
    try {
      await saveCrossTraining({
        kind,
        data: date,
        duracaoMin: Math.max(0, Number(minutes) || 0),
        intensidade: intensity,
        nota: note.trim(),
      });
      await qc.invalidateQueries({ queryKey: ["cross-training"] });
      toast.success(t("Logged — I'll factor it into your next sessions."));
      setOpen(false);
      setNote("");
    } catch {
      toast.error(t("Could not save that activity."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "tap-target flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left",
            className,
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <Activity className="size-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{t("Trained something else?")}</span>
            <span className="block text-xs text-muted-foreground">
              {t("Log a run, a match or a ride")}
            </span>
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>{t("Log other activity")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "tap-target rounded-sm border px-4 text-xs font-semibold",
                  kind === k
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {label(k)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-caps">{t("Date")}</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="label-caps">{t("Minutes")}</span>
              <Input
                type="number"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="mt-1"
              />
            </label>
          </div>

          <div>
            <span className="label-caps">{t("Intensity")}</span>
            <div className="mt-1 flex gap-2">
              {(["easy", "moderate", "hard"] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensity(i)}
                  className={cn(
                    "tap-target flex-1 rounded-sm border px-3 text-xs font-semibold",
                    intensity === i
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {i === "easy" ? t("Easy") : i === "moderate" ? t("Moderate") : t("Hard")}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label-caps">{t("Note")}</span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("10k, legs felt heavy after")}
              className="mt-1"
            />
          </label>

          <Button className="h-12 w-full" disabled={saving} onClick={() => void submit()}>
            {t("Save activity")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
