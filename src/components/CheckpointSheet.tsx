import { Camera, Check, Pencil, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProgressPhotoGallery } from "@/components/ProgressPhotoGallery";
import type { Checkpoint, ProgressPhoto } from "@/lib/route/types";
import { formatDate, formatKg } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** One checkpoint up close: what it asks, when, and how it is going. */
export function CheckpointSheet({
 checkpoint,
 photos,
 onOpenChange,
 onEdit,
 onDelete,
 onMarkReached,
 onAddPhoto,
}: {
 checkpoint: Checkpoint | null;
 photos: ProgressPhoto[];
 onOpenChange: (open: boolean) => void;
 onEdit: () => void;
 onDelete: () => void;
 onMarkReached: () => void;
 onAddPhoto: () => void;
}) {
 const t = useT();
 const cp = checkpoint;

 const statusLabel: Record<Checkpoint["status"], string> = {
 achieved: t("Reached"),
 upcoming: t("On the way"),
 adjusted: t("Moved by your coach"),
 missed: t("Still open"),
 };

 return (
 <Sheet open={Boolean(cp)} onOpenChange={onOpenChange}>
 <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
 {cp ? (
 <>
 <SheetHeader className="text-left">
 <SheetTitle>{cp.title}</SheetTitle>
 </SheetHeader>

 <div className="mt-1 flex flex-wrap items-center gap-2">
 <span
 className={cn(
 "rounded-sm px-2.5 py-1 text-[11px] font-semibold",
 cp.status === "achieved"
 ? "bg-primary/15 text-primary"
 : "bg-muted text-muted-foreground",
 )}
 >
 {statusLabel[cp.status]}
 </span>
 <span className="text-xs text-muted-foreground tabular-nums">
 {formatDate(cp.targetDate)}
 </span>
 </div>

 {cp.metric ? (
 <p className="mt-3 text-sm font-semibold tabular-nums">
 {cp.metric.kind === "sessions"
 ? t("{value} sessions in a month", { value: cp.metric.value })
 : t("Target {value}", { value: formatKg(cp.metric.value) })}
 </p>
 ) : null}

 {cp.description ? (
 <p className="mt-2 text-sm leading-snug text-muted-foreground">{cp.description}</p>
 ) : null}

 {cp.adjustmentReason ? (
 <p className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-xs leading-snug text-muted-foreground">
 {cp.adjustmentReason}
 </p>
 ) : null}

 <ProgressPhotoGallery photos={photos} />

 <div className="mt-5 space-y-2">
 {cp.status !== "achieved" ? (
 <Button className="tap-target w-full" onClick={onMarkReached}>
 <Check className="size-4" /> {t("I reached this")}
 </Button>
 ) : null}
 <Button variant="outline" className="tap-target w-full" onClick={onAddPhoto}>
 <Camera className="size-4" /> {t("Add progress photo")}
 </Button>
 <div className="flex gap-2">
 <Button variant="outline" className="tap-target flex-1" onClick={onEdit}>
 <Pencil className="size-4" /> {t("Edit")}
 </Button>
 <Button variant="ghost" className="tap-target flex-1" onClick={onDelete}>
 <Trash2 className="size-4" /> {t("Remove")}
 </Button>
 </div>
 </div>
 </>
 ) : null}
 </SheetContent>
 </Sheet>
 );
}
