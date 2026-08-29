import { pageMeta } from "@/lib/route-meta";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, Import, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProfile, invalidateProfileCache, saveProfile } from "@/lib/data/profile";
import { fileToAvatarDataUrl } from "@/lib/avatar";
import { getExercises } from "@/lib/data/exercises";
import type { NivelAtividade, Objetivo, PreferredTime, Profile, Sexo } from "@/lib/types";
import { CoachChatButton } from "@/components/CoachChatSheet";
import { AvoidExerciseSheet } from "@/components/AvoidExerciseSheet";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { LANGS, useLanguage, useT } from "@/lib/i18n";
import { ClaudeBridgeSection } from "@/components/ClaudeBridgeSection";
import { GetAPlanCard } from "@/components/plan/GetAPlanCard";
import { Switch } from "@/components/ui/switch";
import { hapticsEnabled, hapticTick, setHapticsEnabled } from "@/lib/haptics";
import { resetOnboarding } from "@/lib/onboarding";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: pageMeta({
      title: "Profile",
      description: "Your body data, training model, equipment and weekly goal.",
    }),
  }),
  component: ProfilePage,
});

const activityLevels: { value: NivelAtividade; label: string }[] = [
  { value: "sedentario", label: "Sedentary" },
  { value: "leve", label: "Light" },
  { value: "moderado", label: "Moderate" },
  { value: "intenso", label: "Intense" },
  { value: "atleta", label: "Athlete" },
];

const goals: { value: Objetivo; label: string }[] = [
  { value: "cutting", label: "Cutting" },
  { value: "manutencao", label: "Maintenance" },
  { value: "bulking", label: "Bulking" },
];

const sexes: { value: Sexo; label: string }[] = [
  { value: "masculino", label: "Male" },
  { value: "feminino", label: "Female" },
  { value: "outro", label: "Other" },
];

const times: { value: PreferredTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Midday" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbells", "Machine", "Cable", "Bodyweight"];
const REASON_SUGGESTIONS = ["Shoulder pain", "Knee pain", "Lower back", "No equipment"];

/**
 * Stable string form of a profile: keys sorted and array fields normalized so
 * key/element order can never fake an "unsaved changes" state.
 */
function profileSnapshot(profile: Profile): string {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(profile).sort()) {
    const value = (profile as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      normalized[key] = [...value]
        .map((item) =>
          item && typeof item === "object"
            ? JSON.stringify(
                Object.fromEntries(
                  Object.entries(item as Record<string, unknown>).sort(([a], [b]) =>
                    a.localeCompare(b),
                  ),
                ),
              )
            : String(item),
        )
        .sort();
    } else {
      normalized[key] = value ?? null;
    }
  }
  return JSON.stringify(normalized);
}

function useAccountEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return email;
}

function ProfilePage() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const [form, setForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [avoidOpen, setAvoidOpen] = useState(false);
  const email = useAccountEmail();

  useEffect(() => {
    if (profileQuery.data && !form) setForm(profileQuery.data);
  }, [profileQuery.data, form]);

  const dirty = useMemo(
    () =>
      Boolean(form && profileQuery.data) &&
      profileSnapshot(form) !== profileSnapshot(profileQuery.data!),
    [form, profileQuery.data],
  );

  if (!form) {
    return (
      <AppShell title={t("Profile")}>
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-card" />
          <div className="h-16 animate-pulse rounded-2xl bg-card" />
          <div className="h-16 animate-pulse rounded-2xl bg-card" />
        </div>
      </AppShell>
    );
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await saveProfile(form!);
      invalidateProfileCache();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Align the form with what the database actually returned, otherwise the
      // sticky "unsaved changes" bar keeps showing after a successful save.
      setForm(saved);
      toast.success(t("Profile saved"));
    } catch (error) {
      // Keep the form untouched so nothing typed is lost, but surface the real
      // reason: a schema or permission problem is otherwise invisible.
      console.error("[profile] save failed", error);
      const detail = errorDetail(error);
      toast.error(t("Could not save your profile. Try again."), {
        description: detail ?? undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function pickPhoto(file: File | null | undefined) {
    if (!file) return;
    try {
      patch({ avatarUrl: await fileToAvatarDataUrl(file) });
    } catch (error) {
      console.error("[profile] photo failed", error);
      toast.error(
        (error as Error).message === "too-large"
          ? t("That image is too large. Pick one under 8 MB.")
          : t("Could not read that image. Try another one."),
      );
    }
  }

  const exercises = exercisesQuery.data ?? [];

  function patch(next: Partial<Profile>) {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function toggleEquipment(item: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.equipment.includes(item);
      return {
        ...prev,
        equipment: has ? prev.equipment.filter((e) => e !== item) : [...prev.equipment, item],
      };
    });
  }

  function toggleAvoid(exerciseId: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.avoidExercises.find((a) => a.exerciseId === exerciseId);
      return {
        ...prev,
        avoidExercises: has
          ? prev.avoidExercises.filter((a) => a.exerciseId !== exerciseId)
          : [...prev.avoidExercises, { exerciseId, reason: "" }],
      };
    });
  }

  function setAvoidReason(exerciseId: string, reason: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            avoidExercises: prev.avoidExercises.map((a) =>
              a.exerciseId === exerciseId ? { ...a, reason } : a,
            ),
          }
        : prev,
    );
  }

  const goalLabel = goals.find((g) => g.value === form.objetivo)?.label ?? "";
  const timeLabel = times.find((x) => x.value === form.preferredTime)?.label ?? "";

  return (
    <AppShell
      title={t("Profile")}
      action={
        <CoachChatButton className="tap-target inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary" />
      }
    >
      {/* Identity header */}
      <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <label
              htmlFor="avatar"
              className="tap-target grid size-14 cursor-pointer place-items-center overflow-hidden rounded-2xl bg-primary/15 font-display text-xl font-semibold text-primary"
              aria-label={t("Change photo")}
            >
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt={t("Profile photo")}
                  className="size-full object-cover"
                />
              ) : (
                (form.nome || "?").trim().charAt(0).toUpperCase()
              )}
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void pickPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="pointer-events-none absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-border bg-card text-primary">
              <Camera className="size-3.5" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold leading-tight">
              {form.nome || t("Your name")}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email ?? t("Signed in")}</p>
            <div className="mt-1 flex items-center gap-3">
              <label
                htmlFor="avatar"
                className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                {form.avatarUrl ? t("Change photo") : t("Add photo")}
              </label>
              {form.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => patch({ avatarUrl: "" })}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3" />
                  {t("Remove photo")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label={t("Weight")} value={`${form.pesoKg} kg`} />
          <Stat label={t("Height")} value={`${form.alturaCm} cm`} />
          <Stat label={t("Goal")} value={t(goalLabel)} />
        </dl>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag>{t("{n}x / week", { n: String(form.metaTreinosSemana) })}</Tag>
          <Tag>{t("{n} min", { n: String(form.sessionLengthMin) })}</Tag>
          <Tag>{t(timeLabel)}</Tag>
          {form.equipment.length > 0 ? (
            <Tag>{t("{n} equipment", { n: String(form.equipment.length) })}</Tag>
          ) : null}
        </div>
      </section>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Section
          title={t("Body & goal")}
          subtitle={t("Used for macros and load suggestions")}
          defaultOpen
        >
          <div className="space-y-2">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input
              id="name"
              value={form.nome}
              onChange={(e) => patch({ nome: e.target.value })}
              className="tap-target h-12 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="weight">{t("Weight (kg)")}</Label>
              <Input
                id="weight"
                inputMode="decimal"
                value={String(form.pesoKg)}
                onChange={(e) => patch({ pesoKg: Number(e.target.value.replace(",", ".")) || 0 })}
                className="numeric-field tap-target h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">{t("Height (cm)")}</Label>
              <Input
                id="height"
                inputMode="numeric"
                value={String(form.alturaCm)}
                onChange={(e) =>
                  patch({ alturaCm: Number(e.target.value.replace(/\D/g, "")) || 0 })
                }
                className="numeric-field tap-target h-12 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("Sex")}</Label>
              <Select value={form.sexo} onValueChange={(v) => patch({ sexo: v as Sexo })}>
                <SelectTrigger className="tap-target h-12 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sexes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Activity level")}</Label>
              <Select
                value={form.nivelAtividade}
                onValueChange={(v) => patch({ nivelAtividade: v as NivelAtividade })}
              >
                <SelectTrigger className="tap-target h-12 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {t(n.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Segmented
            label={t("Goal")}
            columns={3}
            options={goals.map((g) => ({ value: g.value, label: t(g.label) }))}
            value={form.objetivo}
            onChange={(v) => patch({ objetivo: v as Objetivo })}
          />
        </Section>

        <Section title={t("Training model")} subtitle={t("How the coach plans your week")}>
          <Segmented
            label={t("Weekly training target")}
            columns={6}
            options={[2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
            value={String(form.metaTreinosSemana)}
            onChange={(v) => patch({ metaTreinosSemana: Number(v) })}
          />

          <Segmented
            label={t("Preferred session length (minutes)")}
            columns={4}
            options={[30, 45, 60, 75, 90, 105, 120].map((n) => ({
              value: String(n),
              label: String(n),
            }))}
            value={String(form.sessionLengthMin)}
            onChange={(v) => patch({ sessionLengthMin: Number(v) })}
          />

          <Segmented
            label={t("Preferred training time")}
            columns={4}
            options={times.map((x) => ({ value: x.value, label: t(x.label) }))}
            value={form.preferredTime}
            onChange={(v) => patch({ preferredTime: v as PreferredTime })}
          />

          <div className="space-y-2">
            <Label>{t("Equipment available")}</Label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => {
                const on = form.equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className={cn(
                      "tap-target rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {t(item)}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title={t("Limits & check-in")} subtitle={t("What the coach should work around")}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("Exercises to avoid")}</Label>
              <button
                type="button"
                onClick={() => setAvoidOpen(true)}
                className="tap-target inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <Plus className="size-3.5" />
                {t("Add exercise")}
              </button>
            </div>

            {form.avoidExercises.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                {t("Nothing flagged. Add an exercise if pain or equipment blocks it.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {form.avoidExercises.map((a) => {
                  const ex = exercises.find((e) => e.id === a.exerciseId);
                  return (
                    <li
                      key={a.exerciseId}
                      className="rounded-xl border border-border/60 bg-card/70 p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <ExerciseThumb
                          grupo={ex?.grupoPrimario}
                          nome={ex?.nome}
                          className="size-10"
                        />
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {ex?.nome ?? a.exerciseId}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleAvoid(a.exerciseId)}
                          aria-label={t("Remove")}
                          className="tap-target grid size-9 place-items-center rounded-full text-muted-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <Input
                        value={a.reason}
                        onChange={(e) => setAvoidReason(a.exerciseId, e.target.value)}
                        placeholder={t("Reason (e.g., shoulder pain)")}
                        className="mt-2 h-10 text-sm"
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {REASON_SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setAvoidReason(a.exerciseId, t(s))}
                            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            {t(s)}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Segmented
            label={t("Weekly check-in prompt")}
            columns={2}
            options={[
              { value: "card", label: t("Card on Home") },
              { value: "prompt", label: t("Modal prompt") },
            ]}
            value={form.checkInMode}
            onChange={(v) => patch({ checkInMode: v as Profile["checkInMode"] })}
          />
        </Section>

        <Section title={t("App")} subtitle={t("Language, integrations and account")}>
          <div className="space-y-2">
            <Label>{t("Language")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setLang(option.value);
                    patch({ idioma: option.value });
                  }}
                  className={cn(
                    "tap-target rounded-xl border px-2 py-3 text-sm font-semibold transition-colors",
                    lang === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <VibrationToggle />

          <ImportAndQaSection />


          <GetAPlanCard />

          <ClaudeBridgeSection profile={profileQuery.data ?? form} />

          <AccountSection email={email} />
        </Section>
      </form>

      <AvoidExerciseSheet
        open={avoidOpen}
        exercises={exercises}
        selectedIds={form.avoidExercises.map((a) => a.exerciseId)}
        onOpenChange={setAvoidOpen}
        onToggle={toggleAvoid}
      />

      {dirty ? (
        <div className="fixed inset-x-0 bottom-24 z-40 px-4">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-border bg-card/95 p-2.5 backdrop-blur">
            <p className="min-w-0 flex-1 pl-1 text-xs font-semibold text-muted-foreground">
              {t("Unsaved changes")}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="tap-target h-10 px-3 text-xs"
              onClick={() => setForm(profileQuery.data ?? form)}
            >
              {t("Discard")}
            </Button>
            <Button
              type="button"
              disabled={saving}
              className="tap-target h-10 px-4 text-sm font-semibold"
              onClick={save}
            >
              {saving ? t("Saving…") : t("Save")}
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate px-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function Section({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap-target flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border/50 px-4 py-4">{children}</div>
      ) : null}
    </section>
  );
}

function Segmented({
  label,
  options,
  value,
  columns,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  columns: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "tap-target rounded-xl border px-1 py-2.5 text-xs font-semibold tabular-nums transition-colors",
                on
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccountSection({ email }: { email: string | null }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    // Full reload clears the in-memory data caches so the next account starts clean.
    window.location.assign("/");
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("Account")}
      </p>
      <p className="mt-1 truncate text-sm">{email ?? t("Signed in")}</p>
      <Button
        type="button"
        variant="outline"
        disabled={signingOut}
        onClick={handleSignOut}
        className="tap-target mt-3 w-full"
      >
        {signingOut ? t("Signing out…") : t("Sign out")}
      </Button>
    </div>
  );
}

function VibrationToggle() {
  const t = useT();
  const [on, setOn] = useState(true);


  useEffect(() => {
    setOn(hapticsEnabled());
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div>
        <Label htmlFor="haptics">{t("Vibration")}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("Short buzz when you complete a set or hit a personal record.")}
        </p>
      </div>
      <Switch
        id="haptics"
        checked={on}
        onCheckedChange={(next) => {
          setOn(next);
          setHapticsEnabled(next);
          if (next) hapticTick();
        }}
      />
    </div>
  );
}

function ImportAndQaSection() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <Link
        to="/importar"
        className="tap-target flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
      >
        <Import className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("Import from Hevy")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("Bring your history from another app.")}
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => {
          resetOnboarding();
          navigate({ to: "/onboarding" });
        }}
        className="tap-target flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
      >
        <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("Review onboarding")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("Replay the welcome flow and the session coach marks.")}
          </span>
        </span>
      </button>
    </div>
  );
}

/** Short, human-readable reason from a server-function / PostgREST failure. */
function errorDetail(error: unknown): string | null {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (error as { message?: string } | null)?.message;
  if (!raw) return null;
  const text = raw.trim();
  return text.length > 180 ? `${text.slice(0, 180)}\u2026` : text;
}
