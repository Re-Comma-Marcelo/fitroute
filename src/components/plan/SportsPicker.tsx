import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { SPORT_PRESETS, newSport } from "@/lib/plan/sports";
import { DAY_KEYS, type DayKey, type Intensity, type SportEntry } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

const DAY_LABEL: Record<DayKey, string> = {
 mon: "M",
 tue: "T",
 wed: "W",
 thu: "T",
 fri: "F",
 sat: "S",
 sun: "S",
};

const INTENSITIES: Intensity[] = ["low", "moderate", "high"];

export function SportsPicker({
 value,
 onChange,
}: {
 value: SportEntry[];
 onChange: (next: SportEntry[]) => void;
}) {
 const t = useT();

 const patch = (id: string, changes: Partial<SportEntry>) =>
 onChange(value.map((s) => (s.id === id ? { ...s, ...changes } : s)));

 const toggleDay = (sport: SportEntry, day: DayKey) =>
 patch(sport.id, {
 days: sport.days.includes(day) ? sport.days.filter((d) => d !== day) : [...sport.days, day],
 });

 return (
 <div className="space-y-3">
 {value.map((sport) => (
 <div key={sport.id} className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3">
 <div className="flex items-center gap-2">
 <Input
 value={sport.name}
 onChange={(e) => patch(sport.id, { name: e.target.value })}
 className="h-11"
 aria-label={t("Sport name")}
 />
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-11 w-11 shrink-0"
 aria-label={t("Remove sport")}
 onClick={() => onChange(value.filter((s) => s.id !== sport.id))}
 >
 <X className="h-4 w-4" />
 </Button>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">{t("Sessions / week")}</Label>
 <Input
 type="number"
 min={1}
 max={14}
 inputMode="numeric"
 className="h-11"
 value={sport.sessionsPerWeek}
 onChange={(e) => patch(sport.id, { sessionsPerWeek: Number(e.target.value) || 1 })}
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">{t("Minutes / session")}</Label>
 <Input
 type="number"
 min={15}
 max={240}
 inputMode="numeric"
 className="h-11"
 value={sport.durationMin}
 onChange={(e) => patch(sport.id, { durationMin: Number(e.target.value) || 30 })}
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">{t("Intensity")}</Label>
 <div className="flex gap-1.5">
 {INTENSITIES.map((level) => (
 <button
 key={level}
 type="button"
 onClick={() => patch(sport.id, { intensity: level })}
 className={cn(
 "h-11 flex-1 rounded-lg border text-xs font-medium",
 sport.intensity === level
 ? "border-primary/50 bg-primary/15 text-primary"
 : "border-border/60 text-muted-foreground",
 )}
 >
 {t(level === "low" ? "Low" : level === "moderate" ? "Moderate" : "High")}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground">{t("Usual days (optional)")}</Label>
 <div className="flex gap-1">
 {DAY_KEYS.map((day) => (
 <button
 key={day}
 type="button"
 onClick={() => toggleDay(sport, day)}
 aria-pressed={sport.days.includes(day)}
 className={cn(
 "h-11 flex-1 rounded-lg border text-xs font-medium",
 sport.days.includes(day)
 ? "border-primary/50 bg-primary/15 text-primary"
 : "border-border/60 text-muted-foreground",
 )}
 >
 {DAY_LABEL[day]}
 </button>
 ))}
 </div>
 </div>
 </div>
 ))}

 <div className="flex items-center gap-2">
 <Select
 value=""
 onValueChange={(kind) => {
 const preset = SPORT_PRESETS.find((p) => p.kind === kind);
 onChange([...value, newSport(kind, t(preset?.label ?? "Other sport"))]);
 }}
 >
 <SelectTrigger className="h-11">
 <SelectValue placeholder={t("Add another sport")} />
 </SelectTrigger>
 <SelectContent>
 {SPORT_PRESETS.map((preset) => (
 <SelectItem key={preset.kind} value={preset.kind}>
 {t(preset.label)}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
 </div>
 {value.length === 0 ? (
 <p className="text-xs text-muted-foreground">
 {t("Training only in the gym? Leave this empty.")}
 </p>
 ) : null}
 </div>
 );
}
