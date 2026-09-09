import { Eye, EyeOff } from "lucide-react";
import type { ProgressPhoto } from "@/lib/route/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

/** Photo strip, newest first, so two weeks apart sit next to each other. */
export function ProgressPhotoGallery({ photos }: { photos: ProgressPhoto[] }) {
  const t = useT();
  if (!photos.length) return null;

  return (
    <div className="mt-4">
      <p className="label-caps">{t("Progress photos")}</p>
      <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {photos.map((p) => (
          <li key={p.id} className="w-28 shrink-0">
            <img
              src={p.url}
              alt={t("Progress photo")}
              className="h-36 w-28 rounded-lg object-cover"
              loading="lazy"
            />
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
              {p.visibleToAi ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {formatDate(p.takenAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
