import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/route-meta";
import { ProgressView } from "@/components/progress/ProgressView";

export const Route = createFileRoute("/_authenticated/rota/progresso")({
 head: () => ({
 meta: pageMeta({
 title: "Progress",
 description:
 "See your training trajectory: weekly volume trend, key lift progression and coach plateau alerts.",
 ogDescription: "Weekly volume trend, tracked lift progression and session history.",
 }),
 }),
 component: () => <ProgressView />,
});
