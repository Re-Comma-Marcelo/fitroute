import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { HevyImportPanel } from "@/components/import/HevyImportPanel";
import { useT } from "@/lib/i18n";
import { pageMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: pageMeta({
      title: "Import from Hevy",
      description: "Bring your Hevy workout history into Route, with a preview before saving.",
      twitterCard: "summary",
    }),
  }),
  component: ImportPage,
});

function ImportPage() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <AppShell title={t("Import from Hevy")}>
      <HevyImportPanel onFinished={() => navigate({ to: "/inicio" })} />
    </AppShell>
  );
}
