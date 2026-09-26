import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FolderOpen, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createFolder,
  makeFolderCurrent,
  renameFolder,
  routinesInFolder,
  startFromTemplate,
  workoutsInFolder,
} from "@/lib/data/folders";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Routine, TrainingFolder, Workout } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Everything a folder switch can change on screen. */
export const FOLDER_QUERY_KEYS = [
  ["folders"],
  ["routines"],
  ["workouts"],
  ["workout-log"],
  ["today-card"],
] as const;

/**
 * "My folders": the current folder first, then earlier ones. Rename, switch
 * the current folder, or start a new one (empty or carrying the current
 * routines along).
 */
export function FoldersSheet({
  open,
  onOpenChange,
  folders,
  routines,
  workouts,
  onOpenFolder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: TrainingFolder[];
  routines: Routine[];
  workouts: Workout[];
  /** Open the folder's detail (routines, variations, swaps, sessions). */
  onOpenFolder?: (folderId: string) => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  /** Where the new folder's routines come from: "current", "empty" or a template id. */
  const [source, setSource] = useState("current");

  useEffect(() => {
    if (open) return;
    setRenaming(null);
    setCreating(false);
    setNewName("");
    setSource("current");
  }, [open]);

  const current = folders.find((f) => f.status === "atual") ?? null;
  const currentId = current?.id ?? null;
  const others = folders.filter((f) => f.id !== currentId).reverse();
  const currentRoutines = current ? routinesInFolder(routines, current.id, currentId) : [];
  const templates = folders.filter((f) => f.status === "modelo");
  const sources = [
    ...(currentRoutines.length
      ? [
          {
            value: "current",
            label: t("Copy the current routines"),
            hint: t("{count} routines come along — tweak them for the new block.", {
              count: currentRoutines.length,
            }),
          },
        ]
      : []),
    ...templates.map((tpl) => ({
      value: tpl.id,
      label: t("From template {name}", { name: tpl.nome }),
      hint: t("Its standard routines, with the swaps and loads saved when it closed."),
    })),
    { value: "empty", label: t("Start empty"), hint: t("Build new routines or use a template.") },
  ];
  const chosenSource = sources.some((o) => o.value === source) ? source : sources[0]!.value;

  async function refresh() {
    await Promise.all(
      FOLDER_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.success(done);
      return true;
    } catch {
      toast.error(t("Could not update your folders. Try again."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveRename(id: string) {
    const nome = draftName.trim();
    if (!nome) return;
    if (await run(() => renameFolder(id, nome), t("Folder renamed."))) setRenaming(null);
  }

  async function create() {
    const nome = newName.trim();
    if (!nome) return;
    const template = templates.find((tpl) => tpl.id === chosenSource);
    const action = template
      ? () =>
          startFromTemplate({
            template,
            routines: routinesInFolder(routines, template.id, currentId),
            nome,
            withVariations: false,
          })
      : () => createFolder(nome, chosenSource === "current" ? currentRoutines : []);
    if (await run(action, t("{name} is your current folder.", { name: nome }))) onOpenChange(false);
  }

  function summary(folder: TrainingFolder) {
    const r = routinesInFolder(routines, folder.id, currentId).length;
    const w = workoutsInFolder(workouts, folder.id, currentId).length;
    return t("{routines} routines · {sessions} sessions", { routines: r, sessions: w });
  }

  function period(folder: TrainingFolder) {
    return folder.fimEm
      ? t("{start} – {end}", { start: formatDate(folder.inicioEm), end: formatDate(folder.fimEm) })
      : t("since {date}", { date: formatDate(folder.inicioEm) });
  }

  function statusLabel(folder: TrainingFolder) {
    if (folder.status === "atual") return t("Current");
    if (folder.status === "modelo") return t("Template");
    return t("Archived");
  }

  function row(folder: TrainingFolder) {
    const isCurrent = folder.id === currentId;
    return (
      <li
        key={folder.id}
        className={cn(
          "rounded-2xl border p-4",
          isCurrent ? "border-primary/40 bg-card" : "border-border bg-card/60",
        )}
      >
        {renaming === folder.id ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveRename(folder.id);
              }}
              aria-label={t("Folder name")}
              className="h-11"
            />
            <Button
              size="icon"
              className="tap-target size-11 shrink-0"
              disabled={busy || !draftName.trim()}
              aria-label={t("Save")}
              onClick={() => void saveRename(folder.id)}
            >
              <Check className="size-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <FolderOpen
              className={cn(
                "mt-0.5 size-5 shrink-0",
                isCurrent ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold">{folder.nome}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {statusLabel(folder)} · {period(folder)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{summary(folder)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="tap-target size-11 shrink-0"
              aria-label={t("Rename {name}", { name: folder.nome })}
              onClick={() => {
                setRenaming(folder.id);
                setDraftName(folder.nome);
              }}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
        )}
        {renaming !== folder.id && (onOpenFolder || !isCurrent) ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {onOpenFolder ? (
              <Button
                variant="ghost"
                className={cn("h-10 text-xs font-semibold", isCurrent && "col-span-2")}
                onClick={() => onOpenFolder(folder.id)}
              >
                {t("See folder")}
              </Button>
            ) : null}
            {!isCurrent ? (
              <Button
                variant="secondary"
                className={cn("h-10 text-xs font-semibold", !onOpenFolder && "col-span-2")}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => makeFolderCurrent(folder.id),
                    t("{name} is your current folder.", { name: folder.nome }),
                  ).then((ok) => ok && onOpenChange(false))
                }
              >
                {t("Make current")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("My folders")}</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {t(
            "A folder is one training block: its routines and every session done while it was current.",
          )}
        </p>

        <ul className="mt-4 space-y-3">
          {current ? row(current) : null}
          {others.map(row)}
        </ul>

        <div className="mt-4 pb-4">
          {creating ? (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <p className="label-caps">{t("New folder")}</p>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("e.g. Hypertrophy · Oct–Nov")}
                aria-label={t("Folder name")}
                className="h-11"
              />
              {sources.length > 1 ? (
                <div role="radiogroup" aria-label={t("Start with")} className="space-y-1.5">
                  {sources.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={chosenSource === o.value}
                      onClick={() => setSource(o.value)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                        chosenSource === o.value
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-surface-2",
                      )}
                    >
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.hint}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="text-xs leading-snug text-muted-foreground">
                {current
                  ? t("{name} is archived with its sessions. You can make it current again.", {
                      name: current.nome,
                    })
                  : null}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" className="h-11" onClick={() => setCreating(false)}>
                  {t("Cancel")}
                </Button>
                <Button
                  className="h-11 font-semibold"
                  disabled={busy || !newName.trim()}
                  onClick={() => void create()}
                >
                  {busy ? t("Creating…") : t("Create folder")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="tap-target w-full"
              onClick={() => setCreating(true)}
            >
              <Plus className="mr-2 size-4" /> {t("New folder")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
