import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { tx } from "@/lib/format";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { saveCoachChat } from "@/lib/data/coaching";
import type { Exercise } from "@/lib/types";

interface Msg {
 role: "user" | "coach";
 text: string;
 swap?: Exercise[];
}

const SWAP_HINTS = [
 "alternative",
 "swap",
 "replace",
 "instead",
 "don't like",
 "dont like",
 "hurts",
 "pain",
 "alternativa",
 "trocar",
 "substituir",
 "dói",
 "doi",
 "dor",
 "alternatief",
 "wisselen",
 "pijn",
];
const FEEL_HINTS = [
 "feel",
 "where",
 "form",
 "technique",
 "sentir",
 "onde",
 "técnica",
 "voelen",
 "waar",
 "techniek",
];

/**
 * Coach chat during an active workout: swap the current exercise, form cues,
 * short answers only.
 */
export function SessionCoachSheet({
 exerciseId,
 exerciseName,
 sessionExerciseIds,
 workoutId,
 onSwap,
 compact = false,
}: {
 exerciseId: string;
 exerciseName: string;
 sessionExerciseIds: string[];
 workoutId: string;
 onSwap: (exercise: Exercise) => void;
 compact?: boolean;
}) {
 const t = useT();
 const [open, setOpen] = useState(false);
 const [input, setInput] = useState("");
 const [busy, setBusy] = useState(false);
 const [messages, setMessages] = useState<Msg[]>([]);
 const endRef = useRef<HTMLDivElement | null>(null);

 useEffect(() => {
 if (!open) return;
 setMessages([
 {
 role: "coach",
 text: tx("{exercise} — what do you need? A swap, or where you should feel it?", {
 exercise: exerciseName,
 }),
 },
 ]);
 }, [open, exerciseName]);

 useEffect(() => {
 endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
 }, [messages]);

 async function answer(question: string): Promise<Msg> {
 const q = question.toLowerCase();
 const [exercises, profile] = await Promise.all([getExercises(), getProfile()]);
 const target = exercises.find((e) => e.id === exerciseId);

 if (SWAP_HINTS.some((h) => q.includes(h)) && target) {
 const avoided = new Set((profile?.avoidExercises ?? []).map((a) => a.exerciseId));
 const inSession = new Set(sessionExerciseIds);
 const equipment = profile?.equipment ?? [];
 const candidates = exercises
 .filter(
 (e) =>
 e.id !== exerciseId &&
 e.grupoPrimario === target.grupoPrimario &&
 !avoided.has(e.id) &&
 !inSession.has(e.id) &&
 (equipment.length === 0 || equipment.includes(e.equipamento)),
 )
 .slice(0, 3);
 if (!candidates.length) {
 return {
 role: "coach",
 text: tx(
 "Nothing on file that hits {group} with your equipment. Cut the range short and keep the load light instead.",
 { group: target.grupoPrimario },
 ),
 };
 }
 return {
 role: "coach",
 text: tx("Same muscle, easier on that complaint. Pick one and I'll swap it in now."),
 swap: candidates,
 };
 }

 if (FEEL_HINTS.some((h) => q.includes(h)) && target) {
 return {
 role: "coach",
 text:
 target.instrucoes?.trim() ||
 tx("You should feel it in {group}. Slow the way down and keep the joint stacked.", {
 group: target.grupoPrimario,
 }),
 };
 }

 return {
 role: "coach",
 text: tx(
 "Keep the set quality high: control the way down, stop one rep before form breaks. Ask me for a swap if something hurts.",
 ),
 };
 }

 async function submit(e: React.FormEvent) {
 e.preventDefault();
 const question = input.trim();
 if (!question || busy) return;
 setInput("");
 setMessages((m) => [...m, { role: "user", text: question }]);
 setBusy(true);
 const reply = await answer(question);
 setMessages((m) => [...m, reply]);
 setBusy(false);
 void saveCoachChat({ role: "user", content: question, workoutId, exerciseId });
 void saveCoachChat({ role: "coach", content: reply.text, workoutId, exerciseId });
 }

 return (
 <Sheet open={open} onOpenChange={setOpen}>
 <SheetTrigger asChild>
 <button
 type="button"
 className={
 compact
 ? "grid size-10 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary"
 : "tap-target inline-flex h-8 items-center gap-1 rounded-sm bg-primary/10 px-2.5 text-[11px] font-semibold text-primary"
 }
 aria-label={t("Ask your coach")}
 title={t("Ask your coach")}
 >
 <MessageSquare className={compact ? "size-4" : "size-3.5"} strokeWidth={2} />
 {compact ? null : t("Ask coach")}
 </button>
 </SheetTrigger>

 <SheetContent side="bottom" className="flex flex-col">
 <SheetHeader className="pb-2">
 <SheetTitle className="flex items-center gap-2">
 <MessageSquare className="size-5 text-primary" /> {t("Coach")}
 </SheetTitle>
 </SheetHeader>
 <div className="flex h-[60vh] flex-col">
 <div className="flex-1 space-y-3 overflow-y-auto py-2 pr-1">
 {messages.map((m, i) => (
 <div
 key={i}
 className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
 >
 <div
 className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
 m.role === "user"
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-foreground"
 }`}
 >
 <p>{m.text}</p>
 {m.swap?.length ? (
 <div className="mt-2 space-y-1.5">
 {m.swap.map((candidate) => (
 <Button
 key={candidate.id}
 variant="secondary"
 className="h-10 w-full justify-start text-xs font-semibold"
 onClick={() => {
 onSwap(candidate);
 setOpen(false);
 }}
 >
 {candidate.nome}
 </Button>
 ))}
 </div>
 ) : null}
 </div>
 </div>
 ))}
 <div ref={endRef} />
 </div>
 <form onSubmit={(e) => void submit(e)} className="flex gap-2 pb-4 pt-2">
 <Input
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder={t("Ask something...")}
 aria-label={t("Ask your coach")}
 />
 <button
 type="submit"
 className="tap-target flex size-11 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground"
 aria-label={t("Send")}
 disabled={busy}
 >
 <Send className="size-4" />
 </button>
 </form>
 </div>
 </SheetContent>
 </Sheet>
 );
}
