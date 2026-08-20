import { createFileRoute, redirect } from "@tanstack/react-router";

// Acesso livre durante o desenvolvimento: sem login, a raiz vai direto ao app.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
  head: () => ({
    meta: [
      { title: "Forja — Registro de treino de musculação" },
      {
        name: "description",
        content:
          "App mobile para registrar treinos de musculação: rotinas, cargas, PSE e progresso.",
      },
      { property: "og:title", content: "Forja — Registro de treino de musculação" },
      {
        property: "og:description",
        content: "Registre séries, cargas e progresso de musculação em dois toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
