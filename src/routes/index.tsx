import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroLogin from "@/assets/hero-login.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Forja" },
      {
        name: "description",
        content: "Acesse sua conta Forja e registre o treino de musculação em dois toques.",
      },
      { property: "og:title", content: "Entrar — Forja" },
      {
        name: "og:description",
        content: "Acesse sua conta Forja e registre o treino de musculação em dois toques.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail.");
      }

      navigate({ to: "/treino" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-background">
      <img
        src={heroLogin}
        alt="Academia escura com barra e halteres"
        width={1024}
        height={1536}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="veil absolute inset-0" />

      <div className="relative mx-auto w-full max-w-md px-6 pb-12 pt-24">
        <p className="label-caps">Registro de treino</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tight">Forja</h1>
        <p className="mt-2 max-w-[22ch] text-sm leading-relaxed text-muted-foreground">
          Séries, cargas e descanso em dois toques.
        </p>

        <form className="mt-10 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="label-caps">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tap-target h-12 border-border bg-card/70 text-base backdrop-blur"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha" className="label-caps">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tap-target h-12 border-border bg-card/70 text-base backdrop-blur"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="shadow-elegant h-14 w-full text-base font-semibold"
          >
            {loading ? "Carregando..." : mode === "sign-in" ? "Entrar" : "Criar conta"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full text-sm font-medium text-muted-foreground"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in" ? "Criar nova conta" : "Já tenho conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Conectado ao Supabase externo.
        </p>
      </div>
    </div>
  );
}
