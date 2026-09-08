import { useRef, useState } from "react";
import { Camera, Eye, EyeOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fileToPhotoDataUrl } from "@/lib/photo";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Progress photo every two weeks. The user decides per photo whether the coach
 * may look at it; "just for me" photos are never sent anywhere.
 */
export function ProgressPhotoSheet({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { dataUrl: string; visibleToAi: boolean }) => Promise<void> | void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [visibleToAi, setVisibleToAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setDataUrl(await fileToPhotoDataUrl(file));
    } catch {
      setError(t("Could not read that photo. Try another one."));
    }
  }

  async function save() {
    if (!dataUrl) return;
    setBusy(true);
    try {
      await onSave({ dataUrl, visibleToAi });
      setDataUrl(null);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{t("Progress photo")}</SheetTitle>
        </SheetHeader>

        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {t("Same spot, same light, every two weeks. It shows what the scale hides.")}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />

        {dataUrl ? (
          <img
            src={dataUrl}
            alt={t("Progress photo")}
            className="mt-4 max-h-72 w-full rounded-2xl object-cover"
          />
        ) : (
          <Button
            variant="outline"
            className="tap-target mt-4 h-24 w-full flex-col gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-5" />
            {t("Choose a photo")}
          </Button>
        )}

        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <VisibilityOption
            active={!visibleToAi}
            icon={<EyeOff className="size-4" />}
            label={t("Just for me")}
            hint={t("Stays private")}
            onClick={() => setVisibleToAi(false)}
          />
          <VisibilityOption
            active={visibleToAi}
            icon={<Eye className="size-4" />}
            label={t("Share with my coach")}
            hint={t("Used for feedback")}
            onClick={() => setVisibleToAi(true)}
          />
        </div>

        <Button
          className="tap-target mt-4 w-full"
          disabled={!dataUrl || busy}
          onClick={() => void save()}
        >
          {t("Save photo")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function VisibilityOption({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap-target rounded-2xl border p-3 text-left",
        active ? "border-primary/60 bg-primary/10" : "border-border bg-card",
      )}
    >
      <span className="flex items-center gap-2 text-xs font-semibold">
        {icon}
        {label}
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
    </button>
  );
}
