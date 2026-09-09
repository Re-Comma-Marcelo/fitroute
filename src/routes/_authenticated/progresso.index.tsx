import { createFileRoute, redirect } from "@tanstack/react-router";

/** Progress now lives inside the route page; keep old links working. */
export const Route = createFileRoute("/_authenticated/progresso/")({
 beforeLoad: () => {
 throw redirect({ to: "/rota/progresso", replace: true });
 },
});
