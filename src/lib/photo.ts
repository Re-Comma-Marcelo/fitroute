/**
 * Reads a picked image file and downscales it to a JPEG data URL small enough to
 * travel in a server-function payload. Browser only.
 */
const MAX_SIDE = 1280;

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export async function fileToPhotoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("too-large");

  const bitmap = await loadImage(file);
  const w = "width" in bitmap ? bitmap.width : 0;
  const h = "height" in bitmap ? bitmap.height : 0;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h) || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to the <img> path (older Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
