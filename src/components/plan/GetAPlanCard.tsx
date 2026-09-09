import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
 activeVersion,
 dismissPlanPrompt,
 readPlanState,
 shouldShowPlanPrompt,
} from "@/lib/plan/store";
import { cn } from "@/lib/utils";

/**
 * Optional entry point. `dismissible` is used on Home (it can be hidden and only
 * resurfaces later); Profile renders it permanently.
 */
export function GetAPlanCard({
 dismissible = false,
 className,
}: {
 dismissible?: boolean;
 className?: string;
}) {
 const t = useT();
 const [visible, setVisible] = useState(!dismissible);
 const [hasPlan, setHasPlan] = useState(false);

 useEffect(() => {
 if (dismissible) setVisible(shouldShowPlanPrompt());
 setHasPlan(Boolean(activeVersion(readPlanState())));
 }, [dismissible]);

 if (!visible) return null;

 return (
 <section
 className={cn(
 "relative overflow-hidden rounded-lg border border-primary/25 bg-primary/5 p-4",
 className,
 )}
 >
 {dismissible ? (
 <button
 type="button"
 aria-label={t("Dismiss")}
 onClick={() => {
 dismissPlanPrompt();
 setVisible(false);
 }}
 className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground"
 >
 <X className="h-4 w-4" />
 </button>
 ) : null}

 <div className="flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-primary" />
 <h2 className="text-sm font-semibold">{hasPlan ? t("Your AI plan") : t("Get a plan")}</h2>
 </div>
 <p className="mt-1.5 pr-8 text-xs leading-relaxed text-muted-foreground">
 {hasPlan
 ? t("Review, tweak or regenerate the training and food plan built around your week.")
 : t(
 "Answer a few questions about your body, your sports and your week — we build training and food around your actual life.",
 )}
 </p>
 <Button asChild className="mt-3 h-11 w-full">
 <Link to="/plano">{hasPlan ? t("Open my plan") : t("Start the interview")}</Link>
 </Button>
 </section>
 );
}
