/**
 * Share a finished workout: a rendered card (canvas -> PNG) through the Web
 * Share API when available, plus a plain-text version to paste anywhere,
 * including a Claude chat connected to this app.
 */

export interface ShareSummaryData {
  routineName: string;
  dateLabel: string;
  volumeLabel: string;
  durationLabel: string;
  sets: number;
  exercises: number;
  prs: { nome: string; pesoKg: number }[];
}

export function summaryText(data: ShareSummaryData, labels: Record<string, string>): string {
  const lines = [
    `${data.routineName} — ${data.dateLabel}`,
    `${labels["volume"]}: ${data.volumeLabel}`,
    `${labels["duration"]}: ${data.durationLabel}`,
    `${labels["sets"]}: ${data.sets} · ${labels["exercises"]}: ${data.exercises}`,
  ];
  if (data.prs.length) {
    lines.push(`${labels["prs"]}: ${data.prs.map((p) => `${p.nome} ${p.pesoKg}kg`).join(", ")}`);
  }
  lines.push(labels["footer"]!);
  return lines.join("\n");
}

/** Draws a 1080x1080 card. Returns null when canvas is unavailable. */
export async function renderSummaryCard(
  data: ShareSummaryData,
  labels: Record<string, string>,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#12101a");
  gradient.addColorStop(1, "#1c1430");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#a78bfa";
  ctx.font = "600 34px Inter, system-ui, sans-serif";
  ctx.fillText("ROUTE", 88, 140);

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "700 68px Inter, system-ui, sans-serif";
  ctx.fillText(data.routineName.slice(0, 22), 88, 250);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 34px Inter, system-ui, sans-serif";
  ctx.fillText(data.dateLabel, 88, 306);

  ctx.fillStyle = "#71717a";
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillText(labels["volume"]!.toUpperCase(), 88, 430);
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 150px Inter, system-ui, sans-serif";
  ctx.fillText(data.volumeLabel, 88, 570);

  const stats: [string, string][] = [
    [labels["duration"]!, data.durationLabel],
    [labels["sets"]!, String(data.sets)],
    [labels["exercises"]!, String(data.exercises)],
  ];
  stats.forEach(([label, value], i) => {
    const x = 88 + i * 310;
    ctx.fillStyle = "#71717a";
    ctx.font = "600 28px Inter, system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), x, 690);
    ctx.fillStyle = "#f5f3ff";
    ctx.font = "700 62px Inter, system-ui, sans-serif";
    ctx.fillText(value, x, 760);
  });

  if (data.prs.length) {
    ctx.fillStyle = "#34d399";
    ctx.font = "600 32px Inter, system-ui, sans-serif";
    ctx.fillText(`${labels["prs"]}: ${data.prs[0]!.nome} ${data.prs[0]!.pesoKg}kg`, 88, 890);
  }

  ctx.fillStyle = "#52525b";
  ctx.font = "400 28px Inter, system-ui, sans-serif";
  ctx.fillText(labels["footer"]!, 88, 990);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** True when the summary was handed to the OS share sheet. */
export async function shareSummary(
  data: ShareSummaryData,
  labels: Record<string, string>,
): Promise<"shared" | "downloaded" | "failed"> {
  const text = summaryText(data, labels);
  const blob = await renderSummaryCard(data, labels);
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };
  if (blob) {
    const file = new File([blob], "route.png", { type: "image/png" });
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text });
        return "shared";
      } catch {
        return "failed";
      }
    }
  }
  if (nav.share) {
    try {
      await nav.share({ text });
      return "shared";
    } catch {
      return "failed";
    }
  }
  if (blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "route.png";
    link.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  }
  return "failed";
}
