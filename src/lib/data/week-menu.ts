/**
 * Single access point for the weekly meal selection.
 *
 * Local-first, like the day's meal entries: every read and write lands in
 * localStorage immediately and syncs to the optional `week_menu` table in the
 * background when that table exists.
 */

import { fetchWeekMenu, persistWeekMenu } from "../forja.functions";
import {
  archiveIfNewWeek,
  currentWeekStart,
  readArchive,
  readWeekMenu,
  writeWeekMenu,
  type ArchivedWeek,
  type WeekMenu,
} from "../week-menu";
import { getCheckedItems } from "./nutrition";

export type { ArchivedWeek, WeekMenu };
export { currentWeekStart };

function sync(menu: WeekMenu): void {
  void persistWeekMenu({
    data: {
      weekStart: menu.weekStart,
      mealIds: menu.mealIds,
      completedAt: menu.completedAt ?? null,
    },
  }).catch(() => {});
}

/** This week's selection, rolling the previous week into the archive first. */
export async function getWeekMenu(): Promise<WeekMenu> {
  archiveIfNewWeek(getCheckedItems());
  const local = readWeekMenu();
  try {
    const remote = (await fetchWeekMenu({ data: { weekStart: local.weekStart } })) as {
      mealIds: string[];
      completedAt: string | null;
    };
    if (remote.mealIds.length && !local.mealIds.length) {
      return writeWeekMenu({
        ...local,
        mealIds: remote.mealIds,
        ...(remote.completedAt ? { completedAt: remote.completedAt } : {}),
      });
    }
  } catch {
    // Table missing or offline — local state is the source of truth.
  }
  return local;
}

/** Replaces the selection. `complete` marks the interview as done. */
export async function saveWeekSelection(mealIds: string[], complete = false): Promise<WeekMenu> {
  const current = readWeekMenu();
  const completedAt = complete ? new Date().toISOString() : current.completedAt;
  const next: WeekMenu = {
    ...current,
    mealIds: [...new Set(mealIds)],
    ...(completedAt ? { completedAt } : {}),
  };
  writeWeekMenu(next);
  sync(next);
  return next;
}

/** Hides one shopping-list row for the rest of the week. */
export async function removeListItem(key: string): Promise<WeekMenu> {
  const current = readWeekMenu();
  const next: WeekMenu = { ...current, removedKeys: [...new Set([...current.removedKeys, key])] };
  writeWeekMenu(next);
  return next;
}

export function getArchivedWeeks(): ArchivedWeek[] {
  return readArchive();
}
