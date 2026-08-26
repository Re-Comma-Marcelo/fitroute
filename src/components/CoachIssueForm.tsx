import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveCoachNote } from "@/lib/data/coach-notes";
import { cn } from "@/lib/utils";

const TAGS = [
  { value: "soreness", label: "Soreness" },
  { value: "injury", label: "Injury" },
  { value: "tired", label: "Low energy" },
  { value: "short-on-time", label: "Short on time" },
];

/**
 * Minimal issue logging so coach notes have real user data to reference.
 * Same shape as the weekly check-in note.
 */
export function CoachIssueForm({ onSaved }: { onSaved?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function submit() {
    if (!text.trim() && tags.length === 0) return;
    setSaving(true);
    await saveCoachNote({
      kind: "observation",
      content: text.trim() || tags.join(", "),
      tags: [...tags, "issue"],
    });
    setSaving(false);
    setText("");
    setTags([]);
    setOpen(false);
    toast.success(t("Noted — I'll factor that into your next sessions."));
    onSaved?.();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target w-full rounded-xl border border-dashed border-border px-3 py-3 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("Log an issue (soreness, injury, low energy)")}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("Left shoulder sore since Monday's presses…")}
        className="min-h-[72px] text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tagItem) => (
          <button
            key={tagItem.value}
            type="button"
            onClick={() => toggle(tagItem.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              tags.includes(tagItem.value)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t(tagItem.label)}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 font-semibold" disabled={saving} onClick={submit}>
          {t("Save note")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("Cancel")}
        </Button>
      </div>
    </div>
  );
}
