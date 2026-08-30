import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { fileToPhotoDataUrl } from "@/lib/photo";
import { estimateMealFromPhoto, estimateMealFromText } from "@/lib/nutrition-ai.functions";
import { MEAL_SLOTS, SLOT_LABEL, createCustomMeal } from "@/lib/data/nutrition";
import type { Aisle, Meal, MealIngredient, MealSlot, MealTag } from "@/lib/nutrition-types";

type Mode = "input" | "review";
type Source = "text" | "photo";

const AISLES: Aisle[] = ["Produce", "Protein", "Pantry", "Dairy", "Frozen", "Bakery"];

export function AddMealSheet({
  open,
  onOpenChange,
  defaultSlot,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot: MealSlot;
  /** Called with the saved meal so the caller can plan it right away. */
  onCreated: (meal: Meal) => void | Promise<void>;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>("text");
  const [mode, setMode] = useState<Mode>("input");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Meal, "id"> | null>(null);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);

  function reset() {
    setMode("input");
    setDescription("");
    setPhoto(null);
    setDraft(null);
    setError(null);
    setAiNote(null);
    setConfidence(null);
    setBusy(false);
    setSaving(false);
    setSlot(defaultSlot);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await fileToPhotoDataUrl(file));
      setSource("photo");
      setError(null);
    } catch (e) {
      const code = (e as Error).message;
      setError(
        code === "too-large" ? t("That photo is too large.") : t("Could not read that photo."),
      );
    }
  }

  async function estimate() {
    setBusy(true);
    setError(null);
    try {
      const res =
        source === "photo" && photo
          ? await estimateMealFromPhoto({
              data: { imageDataUrl: photo, note: description.trim() || undefined },
            })
          : await estimateMealFromText({ data: { description } });
      if (!res.ok) {
        setError(t(res.error));
        return;
      }
      const m = res.meal;
      setDraft({
        name: m.name,
        slots: (m.slots.length ? m.slots : [slot]) as MealSlot[],
        kcal: Math.round(m.kcal),
        proteinG: Math.round(m.proteinG),
        carbsG: Math.round(m.carbsG),
        fatG: Math.round(m.fatG),
        prepMin: Math.round(m.prepMin),
        tags: m.tags as MealTag[],
        ingredients: m.ingredients as MealIngredient[],
        orderOut: m.tags.includes("order-out"),
        custom: true,
        source,
      });
      setAiNote(m.note ?? null);
      setConfidence(m.confidence);
      setMode("review");
    } catch {
      setError(t("Could not estimate this meal. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const slots = draft.slots.includes(slot) ? draft.slots : [...draft.slots, slot];
      const meal = await createCustomMeal({ ...draft, slots }, source);
      await onCreated(meal);
      toast.success(t("Meal added"));
      onOpenChange(false);
      reset();
    } catch {
      toast.error(t("Could not save this meal. Try again."));
    } finally {
      setSaving(false);
    }
  }

  const canEstimate = source === "photo" ? Boolean(photo) : description.trim().length > 2;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{mode === "input" ? t("Add a meal") : t("Review the estimate")}</SheetTitle>
        </SheetHeader>

        {mode === "input" ? (
          <div className="mt-4 space-y-4 pb-8">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
              {(["text", "photo"] as Source[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`tap-target rounded-lg text-xs font-semibold transition-colors ${
                    s === source ? "bg-diet/15 text-diet" : "text-muted-foreground"
                  }`}
                >
                  {s === "text" ? t("Describe it") : t("Use a photo")}
                </button>
              ))}
            </div>

            {source === "photo" ? (
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void pickPhoto(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center"
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={t("Meal photo")}
                      className="max-h-48 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <Camera className="size-6 text-diet" />
                      <span className="text-sm font-semibold">{t("Take or pick a photo")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("The AI reads the plate and estimates the portions.")}
                      </span>
                    </>
                  )}
                </button>
                {photo ? (
                  <Button
                    variant="ghost"
                    className="tap-target w-full text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    {t("Choose another photo")}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="meal-desc" className="text-xs">
                {source === "photo" ? t("Anything to add? (optional)") : t("What did you eat?")}
              </Label>
              <Textarea
                id="meal-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t("200 g grilled chicken, rice, black beans and a salad")}
              />
            </div>

            <SlotPicker slot={slot} setSlot={setSlot} />

            {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

            <Button
              className="tap-target w-full"
              disabled={!canEstimate || busy}
              onClick={() => void estimate()}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> {t("Estimating…")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" /> {t("Estimate nutrition")}
                </>
              )}
            </Button>
          </div>
        ) : draft ? (
          <div className="mt-4 space-y-4 pb-8">
            <p className="rounded-xl border border-diet/25 bg-diet/5 p-3 text-xs leading-snug text-muted-foreground">
              <span className="font-semibold text-diet">{t("AI estimate")}</span>
              {confidence ? ` · ${t("confidence: {level}", { level: t(confidence) })}` : ""}
              {aiNote ? ` — ${aiNote}` : ""}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="meal-name" className="text-xs">
                {t("Meal name")}
              </Label>
              <Input
                id="meal-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumField
                label={t("Calories")}
                value={draft.kcal}
                onChange={(kcal) => setDraft({ ...draft, kcal })}
              />
              <NumField
                label={t("Protein")}
                value={draft.proteinG}
                onChange={(proteinG) => setDraft({ ...draft, proteinG })}
              />
              <NumField
                label={t("Carbs")}
                value={draft.carbsG}
                onChange={(carbsG) => setDraft({ ...draft, carbsG })}
              />
              <NumField
                label={t("Fat")}
                value={draft.fatG}
                onChange={(fatG) => setDraft({ ...draft, fatG })}
              />
            </div>

            <SlotPicker slot={slot} setSlot={setSlot} />

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground">{t("Ingredients")}</h3>
              <ul className="mt-2 space-y-2">
                {draft.ingredients.map((ing, i) => (
                  <li key={`${ing.name}-${i}`} className="flex items-center gap-2">
                    <Input
                      value={ing.name}
                      aria-label={t("Ingredient")}
                      onChange={(e) => {
                        const next = [...draft.ingredients];
                        next[i] = { ...ing, name: e.target.value };
                        setDraft({ ...draft, ingredients: next });
                      }}
                      className="h-11 flex-1"
                    />
                    <Input
                      value={String(ing.qty)}
                      inputMode="decimal"
                      aria-label={t("Quantity")}
                      onChange={(e) => {
                        const next = [...draft.ingredients];
                        next[i] = { ...ing, qty: Number(e.target.value) || 0 };
                        setDraft({ ...draft, ingredients: next });
                      }}
                      className="h-11 w-16 text-center tabular-nums"
                    />
                    <Input
                      value={ing.unit}
                      aria-label={t("Unit")}
                      onChange={(e) => {
                        const next = [...draft.ingredients];
                        next[i] = { ...ing, unit: e.target.value };
                        setDraft({ ...draft, ingredients: next });
                      }}
                      className="h-11 w-14 text-center"
                    />
                    <button
                      type="button"
                      aria-label={t("Remove")}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          ingredients: draft.ingredients.filter((_, j) => j !== i),
                        })
                      }
                      className="tap-target shrink-0 rounded-lg px-2 text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                className="tap-target mt-2 text-xs"
                onClick={() =>
                  setDraft({
                    ...draft,
                    ingredients: [
                      ...draft.ingredients,
                      { name: "", qty: 0, unit: "g", aisle: AISLES[2] as Aisle },
                    ],
                  })
                }
              >
                <Plus className="mr-1 size-4" /> {t("Add ingredient")}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="tap-target flex-1"
                onClick={() => setMode("input")}
              >
                {t("Back")}
              </Button>
              <Button className="tap-target flex-1" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t("Save to {slot}", { slot: t(SLOT_LABEL[slot]).toLowerCase() })}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SlotPicker({ slot, setSlot }: { slot: MealSlot; setSlot: (s: MealSlot) => void }) {
  const t = useT();
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground">{t("Meal slot")}</h3>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {MEAL_SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            className={`tap-target shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
              s === slot ? "border-diet bg-diet/10 text-diet" : "border-border text-muted-foreground"
            }`}
          >
            {t(SLOT_LABEL[s])}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={String(value)}
        inputMode="numeric"
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        className="h-11 tabular-nums"
      />
    </div>
  );
}
