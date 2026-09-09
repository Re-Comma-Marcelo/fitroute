import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTINE_TEMPLATES, buildTemplateRoutines } from "@/lib/routine-templates";
import { saveRoutine } from "@/lib/data/routines";
import type { Exercise } from "@/lib/types";

/** Turns a template into real routines so a new user is not staring at an empty editor. */
export function RoutineTemplateSheet({
  open,
  onOpenChange,
  exercises,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
}) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function apply(templateId: string) {
    const template = ROUTINE_TEMPLATES.find((tpl) => tpl.id === templateId);
    if (!template) return;
    setBusy(templateId);
    try {
      const routines = buildTemplateRoutines(template, exercises, (source) => t(source));
      const saved = [];
      for (const routine of routines) saved.push(await saveRoutine(routine));
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      onOpenChange(false);
      toast.success(t("{count} routines created.", { count: saved.length }));
      const first = saved[0];
      if (first) navigate({ to: "/rotina/$id", params: { id: first.id } });
    } catch {
      toast.error(t("Could not create the routines. Check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("Start from a template")}</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {t("Each template creates one routine per training day — edit anything afterwards.")}
        </p>
        <ul className="mt-4 space-y-3 pb-4">
          {ROUTINE_TEMPLATES.map((template) => (
            <li key={template.id} className="rounded-lg border border-border bg-card p-4">
              <p className="font-display text-sm font-semibold">{t(template.nome)}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {t(template.descricao)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {template.days.map((d) => t(d.nome)).join(" · ")}
              </p>
              <Button
                className="mt-3 h-11 w-full font-semibold"
                disabled={busy !== null || exercises.length === 0}
                onClick={() => void apply(template.id)}
              >
                {busy === template.id ? t("Creating…") : t("Use this template")}
              </Button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
