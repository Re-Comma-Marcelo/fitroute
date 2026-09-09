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

  ctx.fillStyle = "#EFEBE4";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#4B2FBF";
  ctx.fillRect(88, 88, 320, 14);
  ctx.fillStyle = "#B44A26";
  ctx.fillRect(408, 81, 28, 28);
  ctx.fillStyle = "#16151A";
  ctx.font = "800 42px Archivo, system-ui, sans-serif";
  ctx.fillText("ROUTE", 88, 170);

  ctx.fillStyle = "#16151A";
  ctx.font = "700 68px Archivo, system-ui, sans-serif";
  ctx.fillText(data.routineName.slice(0, 22).toUpperCase(), 88, 280);

  ctx.fillStyle = "#2C4A6E";
  ctx.font = "400 34px Chivo, system-ui, sans-serif";
  ctx.fillText(data.dateLabel, 88, 336);

  ctx.fillStyle = "#16151A";
  ctx.font = "700 30px Chivo, system-ui, sans-serif";
  ctx.fillText(labels["volume"]!.toUpperCase(), 88, 430);
  ctx.fillStyle = "#2C4A6E";
  ctx.font = "400 150px Chivo, system-ui, sans-serif";
  ctx.fillText(data.volumeLabel, 88, 570);

  const stats: [string, string][] = [
    [labels["duration"]!, data.durationLabel],
    [labels["sets"]!, String(data.sets)],
    [labels["exercises"]!, String(data.exercises)],
  ];
  stats.forEach(([label, value], i) => {
    const x = 88 + i * 310;
    ctx.fillStyle = "#16151A";
    ctx.font = "700 28px Chivo, system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), x, 690);
    ctx.fillStyle = "#2C4A6E";
    ctx.font = "400 62px Chivo, system-ui, sans-serif";
    ctx.fillText(value, x, 760);
  });

  if (data.prs.length) {
    ctx.fillStyle = "#B44A26";
    ctx.font = "700 32px Chivo, system-ui, sans-serif";
    ctx.fillText(`${labels["prs"]}: ${data.prs[0]!.nome} ${data.prs[0]!.pesoKg}kg`, 88, 890);
  }

  ctx.fillStyle = "#B4AFA6";
  ctx.font = "300 28px Chivo, system-ui, sans-serif";
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
    const file = new File([blob], "route-training.png", { type: "image/png" });
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
    link.download = "route-training.png";
    link.click();
    URL.revokeObjectURL(url);
    return "downloaded";
  }
  return "failed";
}
