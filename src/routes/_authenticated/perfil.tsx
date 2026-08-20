import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import type { NivelAtividade, Objetivo, Profile, Sexo } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Forja" },
      {
        name: "description",
        content: "Seus dados: peso, altura, sexo, nível de atividade e objetivo de treino.",
      },
      { property: "og:title", content: "Perfil — Forja" },
      { property: "og:description", content: "Ajuste peso, altura, nível de atividade e objetivo." },
    ],
  }),
  component: ProfilePage,
});

const niveis: { value: NivelAtividade; label: string }[] = [
  { value: "sedentario", label: "Sedentário" },
  { value: "leve", label: "Leve" },
  { value: "moderado", label: "Moderado" },
  { value: "intenso", label: "Intenso" },
  { value: "atleta", label: "Atleta" },
];

const objetivos: { value: Objetivo; label: string }[] = [
  { value: "cutting", label: "Cutting" },
  { value: "manutencao", label: "Manutenção" },
  { value: "bulking", label: "Bulking" },
];

const sexos: { value: Sexo; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

function ProfilePage() {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const updateProfile = useServerFn(saveProfile);
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile(undefined) });
  const [form, setForm] = useState<Profile | null>(null);

  useEffect(() => {
    if (profileQuery.data && !form) setForm(profileQuery.data);
  }, [profileQuery.data, form]);

  if (!form) {
    return (
      <AppShell title="Perfil">
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </AppShell>
    );
  }

  async function salvar() {
    await updateProfile({ data: form! });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Perfil salvo");
  }

  return (
    <AppShell title="Perfil">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="tap-target h-12 text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="peso">Peso (kg)</Label>
            <Input
              id="peso"
              inputMode="decimal"
              value={String(form.pesoKg)}
              onChange={(e) =>
                setForm({ ...form, pesoKg: Number(e.target.value.replace(",", ".")) || 0 })
              }
              className="numeric-field tap-target h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="altura">Altura (cm)</Label>
            <Input
              id="altura"
              inputMode="numeric"
              value={String(form.alturaCm)}
              onChange={(e) =>
                setForm({ ...form, alturaCm: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
              className="numeric-field tap-target h-12 text-base"
            />
          </div>
        </div>

        <Field label="Sexo">
          <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as Sexo })}>
            <SelectTrigger className="tap-target h-12 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sexos.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Nível de atividade">
          <Select
            value={form.nivelAtividade}
            onValueChange={(v) => setForm({ ...form, nivelAtividade: v as NivelAtividade })}
          >
            <SelectTrigger className="tap-target h-12 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {niveis.map((n) => (
                <SelectItem key={n.value} value={n.value}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Objetivo">
          <div className="grid grid-cols-3 gap-2">
            {objetivos.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm({ ...form, objetivo: o.value })}
                className={`tap-target rounded-lg border px-2 py-3 text-sm font-bold transition-colors ${
                  form.objetivo === o.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Meta de treinos por semana">
          <div className="grid grid-cols-6 gap-2">
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, metaTreinosSemana: n })}
                className={`tap-target rounded-lg border py-3 text-sm font-bold tabular-nums transition-colors ${
                  form.metaTreinosSemana === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Button type="submit" className="h-14 w-full text-base font-bold">
          Salvar perfil
        </Button>
      </form>
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
