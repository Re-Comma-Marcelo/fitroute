import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { enableReminder, getReminder, setReminder } from "@/lib/workout-reminder";
import { notificationsSupported } from "@/lib/rest-notification";

/** Local reminder on the days a routine is planned. No server push. */
export function WorkoutReminderSection() {
 const t = useT();
 const [enabled, setEnabled] = useState(false);
 const [time, setTime] = useState("18:00");
 const [supported, setSupported] = useState(true);

 useEffect(() => {
 const settings = getReminder();
 setEnabled(settings.enabled);
 setTime(settings.time);
 setSupported(notificationsSupported());
 }, []);

 async function toggle(next: boolean) {
 if (!next) {
 setEnabled(false);
 setReminder({ enabled: false, time });
 toast.success(t("Reminder off."));
 return;
 }
 const ok = await enableReminder(time);
 setEnabled(ok);
 if (ok) toast.success(t("Reminder on for {time}.", { time }));
 else toast.error(t("Notifications are blocked in your browser settings."));
 }

 if (!supported) return null;

 return (
 <div className="space-y-3 rounded-lg border border-border bg-card px-4 py-3">
 <div className="flex items-start justify-between gap-3">
 <div>
 <Label>{t("Workout reminder")}</Label>
 <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
 {t(
 "We notify you on the days your routines are planned, while the app is open or installed.",
 )}
 </p>
 </div>
 <Switch
 checked={enabled}
 onCheckedChange={(v) => void toggle(v)}
 aria-label={t("Workout reminder")}
 />
 </div>
 {enabled ? (
 <div className="flex items-center justify-between gap-3">
 <Label htmlFor="reminder-time" className="text-xs text-muted-foreground">
 {t("Reminder time")}
 </Label>
 <Input
 id="reminder-time"
 type="time"
 value={time}
 className="numeric-field h-11 w-32 text-center"
 onChange={(e) => {
 setTime(e.target.value);
 setReminder({ enabled: true, time: e.target.value });
 }}
 />
 </div>
 ) : null}
 </div>
 );
}
