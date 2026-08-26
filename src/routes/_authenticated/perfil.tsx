import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { getProfile, saveProfile } from "@/lib/data/profile";
import { getExercises } from "@/lib/data/exercises";
import type { NivelAtividade, Objetivo, PreferredTime, Profile, Sexo } from "@/lib/types";
import { CoachChatButton } from "@/components/CoachChatSheet";
import { LANGS, useLanguage, useT } from "@/lib/i18n";
import { ClaudeBridgeSection } from "@/components/ClaudeBridgeSection";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Profile — Forja" },
      {
        name: "description",
        content: "Your body data, training model, equipment and weekly goal.",
      },
      { property: "og:title", content: "Profile — Forja" },
      { property: "og:description", content: "Your body data, training model, equipment and weekly goal." },
    ],
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

function ProfilePage() {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: getExercises });
  const [form, setForm] = useState<Profile | null>(null);

  useEffect(() => {
    if (profileQuery.data && !form) setForm(profileQuery.data);
  }, [profileQuery.data, form]);

  if (!form) {
    return (
      <AppShell title={t("Profile")}>
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </AppShell>
    );
  }

  async function save() {
    await saveProfile(form!);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success(t("Profile saved"));
  }

  const exercises = exercisesQuery.data ?? [];

  function toggleEquipment(item: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.equipment.includes(item);
      const next = has ? prev.equipment.filter((e) => e !== item) : [...prev.equipment, item];
      return { ...prev, equipment: next };
    });
  }

  function toggleAvoid(exerciseId: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.avoidExercises.find((a) => a.exerciseId === exerciseId);
      const next = has
        ? prev.avoidExercises.filter((a) => a.exerciseId !== exerciseId)
        : [...prev.avoidExercises, { exerciseId, reason: "" }];
      return { ...prev, avoidExercises: next };
    });
  }

  function setAvoidReason(exerciseId: string, reason: string) {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        avoidExercises: prev.avoidExercises.map((a) =>
          a.exerciseId === exerciseId ? { ...a, reason } : a,
        ),
      };
    });
  }

  return (
    <AppShell
      title={t("Profile")}
      action={
        <CoachChatButton className="tap-target inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary" />
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={t("Language")}>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setLang(option.value);
                  setForm({ ...form!, idioma: option.value });
                }}
                className={cn(
                  "tap-target rounded-lg border px-2 py-3 text-sm font-bold transition-colors",
                  lang === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="space-y-2">
          <Label htmlFor="name">{t("Name")}</Label>
          <Input
            id="name"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
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
              onChange={(e) =>
                setForm({ ...form, pesoKg: Number(e.target.value.replace(",", ".")) || 0 })
              }
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
                setForm({ ...form, alturaCm: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
              className="numeric-field tap-target h-12 text-base"
            />
          </div>
        </div>

        <Field label={t("Sex")}>
          <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as Sexo })}>
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
        </Field>

        <Field label={t("Activity level")}>
          <Select
            value={form.nivelAtividade}
            onValueChange={(v) => setForm({ ...form, nivelAtividade: v as NivelAtividade })}
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
        </Field>

        <Field label={t("Goal")}>
          <div className="grid grid-cols-3 gap-2">
            {goals.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm({ ...form, objetivo: o.value })}
                className={cn(
                  "tap-target rounded-lg border px-2 py-3 text-sm font-bold transition-colors",
                  form.objetivo === o.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {t(o.label)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Weekly training target")}>
          <div className="grid grid-cols-6 gap-2">
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, metaTreinosSemana: n })}
                className={cn(
                  "tap-target rounded-lg border py-3 text-sm font-bold tabular-nums transition-colors",
                  form.metaTreinosSemana === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Equipment available")}>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={cn(
                  "tap-target rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                  form.equipment.includes(item)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {t(item)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Preferred session length (minutes)")}>
          <div className="grid grid-cols-5 gap-2">
            {[30, 45, 60, 75, 90, 105, 120].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, sessionLengthMin: n })}
                className={cn(
                  "tap-target rounded-lg border py-2.5 text-xs font-bold tabular-nums transition-colors",
                  form.sessionLengthMin === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Preferred training time")}>
          <div className="grid grid-cols-4 gap-2">
            {times.map((time) => (
              <button
                key={time.value}
                type="button"
                onClick={() => setForm({ ...form, preferredTime: time.value })}
                className={cn(
                  "tap-target rounded-lg border py-3 text-xs font-bold transition-colors",
                  form.preferredTime === time.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {t(time.label)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Exercises to avoid")}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {exercises.map((ex) => {
                const avoided = form.avoidExercises.find((a) => a.exerciseId === ex.id);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggleAvoid(ex.id)}
                    className={cn(
                      "tap-target rounded-full border px-3 py-2 text-xs font-bold transition-colors",
                      avoided
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-border bg-card",
                    )}
                  >
                    {ex.nome}
                  </button>
                );
              })}
            </div>
            {form.avoidExercises.map((a) => {
              const ex = exercises.find((e) => e.id === a.exerciseId);
              if (!ex) return null;
              return (
                <div key={a.exerciseId} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">{ex.nome}</p>
                  <Input
                    value={a.reason}
                    onChange={(e) => setAvoidReason(a.exerciseId, e.target.value)}
                    placeholder={t("Reason (e.g., shoulder pain)")}
                    className="h-10 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </Field>

        <Field label={t("Weekly check-in prompt")}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "card" as const, label: "Card on Home" },
              { value: "prompt" as const, label: "Modal prompt" },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm({ ...form, checkInMode: m.value })}
                className={cn(
                  "tap-target rounded-lg border py-3 text-sm font-bold transition-colors",
                  form.checkInMode === m.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {t(m.label)}
              </button>
            ))}
          </div>
        </Field>

        <Button type="submit" className="h-14 w-full text-base font-bold">
          {t("Save profile")}
        </Button>
      </form>

      <div className="mt-6">
        <ClaudeBridgeSection profile={profileQuery.data ?? form} />
      </div>

      <AccountSection />
    </AppShell>

  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AccountSection() {
  const t = useT();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    // Full reload clears the in-memory data caches so the next account starts clean.
    window.location.assign("/");
  }

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-card/70 p-4">
      <h2 className="font-display text-sm font-semibold text-foreground">{t("Account")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{email ?? t("Signed in")}</p>
      <Button
        variant="outline"
        disabled={signingOut}
        onClick={handleSignOut}
        className="tap-target mt-3 w-full"
      >
        {signingOut ? t("Signing out…") : t("Sign out")}
      </Button>
    </section>
  );
}
