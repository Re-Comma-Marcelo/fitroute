import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { exerciseThumbUrl } from "@/lib/exerciseMedia";
import { getExercises } from "@/lib/data/exercises";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TrackedLiftPickerSheet({
 open,
 trackedIds,
 onOpenChange,
 onToggle,
}: {
 open: boolean;
 trackedIds: string[];
 onOpenChange: (open: boolean) => void;
 onToggle: (exerciseId: string, tracked: boolean) => void;
}) {
 const t = useT();
 const [term, setTerm] = useState("");
 const exercisesQ = useQuery({ queryKey: ["exercises"], queryFn: getExercises, enabled: open });
 const q = term.trim().toLowerCase();
 const list = (exercisesQ.data ?? []).filter(
 (e) => !q || e.nome.toLowerCase().includes(q) || e.grupoPrimario.toLowerCase().includes(q),
 );

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
 <SheetHeader className="text-left">
 <SheetTitle>{t("Track a lift")}</SheetTitle>
 </SheetHeader>

 <Input
 value={term}
 onChange={(e) => setTerm(e.target.value)}
 placeholder={t("Search exercises")}
 className="mt-3 h-11"
 />

 <ul className="mt-3 space-y-2 pb-6">
 {list.map((e) => {
 const tracked = trackedIds.includes(e.id);
 return (
 <li key={e.id}>
 <button
 type="button"
 onClick={() => onToggle(e.id, !tracked)}
 className={cn(
 "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
 tracked ? "border-primary/50 bg-primary/[0.06]" : "border-border bg-card",
 )}
 >
 <ExerciseThumb grupo={e.grupoPrimario} nome={e.nome} src={exerciseThumbUrl(e)} />
 <span className="min-w-0 flex-1">
 <span className="block truncate font-display text-sm font-semibold leading-tight">
 {e.nome}
 </span>
 <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
 {e.grupoPrimario} · {e.equipamento}
 </span>
 </span>
 {tracked ? <Check className="size-5 shrink-0 text-primary" /> : null}
 </button>
 </li>
 );
 })}
 {list.length === 0 ? (
 <li className="py-6 text-center text-sm text-muted-foreground">
 {t("No exercises found.")}
 </li>
 ) : null}
 </ul>
 </SheetContent>
 </Sheet>
 );
}
