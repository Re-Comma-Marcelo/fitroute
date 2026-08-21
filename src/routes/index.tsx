import { createFileRoute, redirect } from "@tanstack/react-router";

// Free entry during development: no login, root redirects straight into the app.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
  head: () => ({
    meta: [
      { title: "Forja — AI strength training tracker" },
      {
        name: "description",
        content:
          "Mobile-first strength tracker: routines, weights, RPE and adaptive AI coaching.",
      },
      { property: "og:title", content: "Forja — AI strength training tracker" },
      {
        property: "og:description",
        content: "Log sets, weights and progress in two taps. Built around your recovery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
