import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getExercises } from "@/lib/data/exercises";
import type { Checkpoint, CheckpointMetric } from "@/lib/route/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MetricKind = CheckpointMetric["kind"] | "none";

/** Create or edit one checkpoint. The user always stays in control of the route. */
export function CheckpointEditSheet({
  open,
  checkpoint,
  defaultDate,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  checkpoint: Checkpoint | null;
  defaultDate: string;
  onOpenChange: (open: boolean) => void;
  onSave: (input: Omit<Checkpoint, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
}) {
  const t = useT();
  const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises, enabled: open });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [kind, setKind] = useState<MetricKind>("none");
  const [exerciseId, setExerciseId] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(checkpoint?.title ?? "");
    setDescription(checkpoint?.description ?? "");
    setDate(checkpoint?.targetDate ?? defaultDate);
    setKind(checkpoint?.metric?.kind ?? "none");
    setExerciseId(checkpoint?.metric?.exerciseId ?? "");
    setValue(checkpoint?.metric ? String(checkpoint.metric.value) : "");
  }, [open, checkpoint, defaultDate]);

  const kinds: { key: MetricKind; label: string }[] = [
    { key: "lift", label: t("Lift target") },
    { key: "sessions", label: t("Sessions per month") },
    { key: "weight", label: t("Body weight") },
    { key: "none", label: t("Just a note") },
  ];

  function submit() {
    const parsed = Number(value.replace(",", "."));
    const metric: CheckpointMetric | undefined =
      kind === "none" || !Number.isFinite(parsed) || parsed <= 0
        ? undefined
        : {
            kind,
            value: parsed,
            ...(kind === "lift" && exerciseId ? { exerciseId } : {}),
          };
    onSave({
      ...(checkpoint?.id ? { id: checkpoint.id } : {}),
      title: title.trim() || t("Checkpoint"),
      ...(description.trim() ? { description: description.trim() } : {}),
      targetDate: date,
      orderIndex: checkpoint?.orderIndex ?? 99,
      status: checkpoint?.status ?? "upcoming",
      source: checkpoint ? "user_edited" : "user_created",
      ...(checkpoint?.adjustmentReason ? { adjustmentReason: checkpoint.adjustmentReason } : {}),
      ...(checkpoint?.achievedAt ? { achievedAt: checkpoint.achievedAt } : {}),
      ...(metric ? { metric } : {}),
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{checkpoint ? t("Edit checkpoint") : t("New checkpoint")}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="label-caps">{t("Title")}</span>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Squat 100 kg")}
            />
          </label>

          <label className="block">
            <span className="label-caps">{t("Target date")}</span>
            <Input
              className="mt-1"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div>
            <span className="label-caps">{t("How do we measure it?")}</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {kinds.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKind(k.key)}
                  className={cn(
                    "tap-target rounded-sm border px-3 py-1.5 text-xs font-semibold",
                    kind === k.key
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {kind === "lift" ? (
            <label className="block">
              <span className="label-caps">{t("Exercise")}</span>
              <select
                className="tap-target mt-1 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
              >
                <option value="">{t("Pick an exercise")}</option>
                {(exercisesQ.data ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind !== "none" ? (
            <label className="block">
              <span className="label-caps">
                {kind === "sessions" ? t("Sessions") : t("Kilograms")}
              </span>
              <Input
                className="mt-1 tabular-nums"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="label-caps">{t("Note (optional)")}</span>
            <Textarea
              className="mt-1"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <Button className="tap-target w-full" onClick={submit}>
            {t("Save checkpoint")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
