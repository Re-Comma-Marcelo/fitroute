import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // TODO: Supabase Auth — nenhuma validação aqui, só navegação visual.
  function entrar() {
    navigate({ to: "/treino" });
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="size-7" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Forja</h1>
            <p className="text-sm text-muted-foreground">Seu treino, registrado em 2 toques.</p>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            entrar();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              className="tap-target h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha" className="text-base">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="tap-target h-12 text-base"
            />
          </div>

          <Button type="submit" className="h-14 w-full text-base font-bold">
            Entrar
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-14 w-full text-base font-semibold"
            onClick={entrar}
          >
            Entrar com link mágico
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Demonstração visual — os dados são de exemplo.
        </p>
      </div>
    </div>
  );
}