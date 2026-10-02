import { BookOpen } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SOURCES, type SourceId } from "@/lib/science/sources";
import { cn } from "@/lib/utils";

/**
 * One short line of advice and the studies behind it, each a link to the
 * paper. The app's numbers are only as credible as their sources, so every
 * piece of advice shows where it comes from — briefly.
 */
export function ResearchNote({
  text,
  sources,
  className,
}: {
  text: string;
  sources: SourceId[];
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("text-xs leading-snug text-muted-foreground", className)}>
      <p>{text}</p>
      {sources.length ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <BookOpen className="size-3 shrink-0" aria-hidden />
          <span className="sr-only">{t("Sources")}</span>
          {sources.map((id) => {
            const source = SOURCES[id];
            return source.url ? (
              <a
                key={id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                title={`${source.title} — ${source.journal}`}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {source.cite}
              </a>
            ) : (
              <span key={id} title={source.title} className="font-semibold">
                {source.cite}
              </span>
            );
          })}
        </p>
      ) : null}
    </div>
  );
}
