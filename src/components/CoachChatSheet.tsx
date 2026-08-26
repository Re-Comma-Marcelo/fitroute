import { useState } from "react";
import { useT } from "@/lib/i18n";
import { ChevronRight, MessageSquare, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askCoach } from "@/lib/coach/chat";
import type { CoachInsight } from "@/lib/coach/types";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  role: "user" | "coach";
  text: string;
  insights: CoachInsight[];
}

function CoachSheet({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col" side="bottom">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            {t("Coach")}
          </SheetTitle>
        </SheetHeader>
        <ChatPanel />
      </SheetContent>
    </Sheet>
  );
}

export function CoachChatButton({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <CoachSheet>
      <button
        type="button"
        className={
          className ??
          "tap-target inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm"
        }
        aria-label={t("Ask your coach")}
      >
        {children ?? <MessageSquare className="size-5" strokeWidth={2} />}
      </button>
    </CoachSheet>
  );
}

export function CoachChatRow({ label }: { label?: string }) {
  const t = useT();
  const displayLabel = label ?? t("Any questions about today's training?");
  return (
    <CoachSheet>
      <button
        type="button"
        className="tap-target flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
        aria-label={t("Ask your coach")}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="size-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{displayLabel}</span>
          <span className="block text-xs text-muted-foreground">{t("Ask your coach")}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </button>
    </CoachSheet>
  );
}

function ChatPanel() {
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      text: t("What can I help with? Ask about today’s plan, a stalled lift, recovery, or nutrition."),
      insights: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question, insights: [] }]);
    setLoading(true);
    const { answer, insights } = await askCoach(question);
    setMessages((m) => [
      ...m,
      { role: "coach", text: answer, insights: insights.slice(0, 2) },
    ]);
    setLoading(false);
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto py-3 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p>{msg.text}</p>
              {msg.insights.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        insight.severity === "warning"
                          ? "bg-warn/15 text-warn"
                          : "bg-info/15 text-info"
                      }`}
                    >
                      {insight.title}: {insight.body}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] space-y-2 rounded-2xl bg-muted px-4 py-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 pt-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Ask something...")}
          className="h-12 flex-1"
          aria-label={t("Ask your coach")}
        />
        <Button
          type="submit"
          size="icon"
          className="tap-target size-12 shrink-0"
          disabled={loading || !input.trim()}
          aria-label={t("Send")}
        >
          <Send className="size-5" />
        </Button>
      </form>
    </div>
  );
}
