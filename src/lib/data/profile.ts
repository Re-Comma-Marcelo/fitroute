import { fetchProfile, persistProfile } from "../forja.functions";
import type { Profile } from "../types";

const FALLBACK: Profile = {
  id: "p1",
  nome: "",
  pesoKg: 80,
  alturaCm: 178,
  sexo: "masculino",
  nivelAtividade: "moderado",
  objetivo: "manutencao",
  metaTreinosSemana: 4,
  equipment: ["Barbell", "Dumbbells", "Machine", "Cable"],
  avoidExercises: [],
  sessionLengthMin: 60,
  preferredTime: "evening",
  checkInMode: "card",
  idioma: "en",
};

let cache: Profile | null = null;

/**
 * Goal fields arrived with a later migration. When the database does not have
 * those columns yet, they are kept on this device so the Route still works.
 */
const GOAL_KEY = "ironlogger.profileGoal.v1";
type GoalOverlay = Partial<
  Pick<Profile, "metaPrazo" | "pesoMetaKg" | "metaIniciadaEm" | "onboardingConcluidoEm">
>;

function readGoalOverlay(): GoalOverlay {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GOAL_KEY);
    return raw ? (JSON.parse(raw) as GoalOverlay) : {};
  } catch {
    return {};
  }
}

function writeGoalOverlay(next: GoalOverlay) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOAL_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** Overlay only fills gaps: whatever the database returned wins. */
function withGoalOverlay(profile: Profile): Profile {
  const overlay = readGoalOverlay();
  return {
    ...profile,
    ...(profile.metaPrazo ? {} : overlay.metaPrazo ? { metaPrazo: overlay.metaPrazo } : {}),
    ...(profile.pesoMetaKg ? {} : overlay.pesoMetaKg ? { pesoMetaKg: overlay.pesoMetaKg } : {}),
    ...(profile.metaIniciadaEm
      ? {}
      : overlay.metaIniciadaEm
        ? { metaIniciadaEm: overlay.metaIniciadaEm }
        : {}),
    ...(profile.onboardingConcluidoEm
      ? {}
      : overlay.onboardingConcluidoEm
        ? { onboardingConcluidoEm: overlay.onboardingConcluidoEm }
        : {}),
  };
}

/** Drop the in-memory copy so the next read hits the database. */
export function invalidateProfileCache() {
  cache = null;
}

export async function getProfile(): Promise<Profile> {
  if (cache) return cache;
  const found = await fetchProfile();
  cache = withGoalOverlay((found as Profile | null) ?? FALLBACK);
  return cache;
}

export async function saveProfile(next: Profile): Promise<Profile> {
  const wanted: Profile = { ...next, id: next.id || "p1" };
  try {
    const saved = withGoalOverlay((await persistProfile({ data: { profile: wanted } })) as Profile);
    // The row came back without the goal fields: the columns are missing.
    if (
      (wanted.metaPrazo && !saved.metaPrazo) ||
      (wanted.pesoMetaKg && !saved.pesoMetaKg) ||
      (wanted.metaIniciadaEm && !saved.metaIniciadaEm) ||
      (wanted.onboardingConcluidoEm && !saved.onboardingConcluidoEm)
    ) {
      writeGoalOverlay({
        ...(wanted.metaPrazo ? { metaPrazo: wanted.metaPrazo } : {}),
        ...(wanted.pesoMetaKg ? { pesoMetaKg: wanted.pesoMetaKg } : {}),
        ...(wanted.metaIniciadaEm ? { metaIniciadaEm: wanted.metaIniciadaEm } : {}),
        ...(wanted.onboardingConcluidoEm
          ? { onboardingConcluidoEm: wanted.onboardingConcluidoEm }
          : {}),
      });
      cache = withGoalOverlay(saved);
      return cache;
    }
    cache = saved;
    return cache;
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    const missingColumn =
      message.includes("PGRST204") ||
      /meta_prazo|peso_meta_kg|meta_iniciada_em|onboarding_concluido_em/.test(message) ||
      /column .* does not exist/i.test(message);
    if (!missingColumn) throw error;
    // Keep the goal on this device and retry without the unsupported fields.
    writeGoalOverlay({
      ...(wanted.metaPrazo ? { metaPrazo: wanted.metaPrazo } : {}),
      ...(wanted.pesoMetaKg ? { pesoMetaKg: wanted.pesoMetaKg } : {}),
      ...(wanted.metaIniciadaEm ? { metaIniciadaEm: wanted.metaIniciadaEm } : {}),
      ...(wanted.onboardingConcluidoEm
        ? { onboardingConcluidoEm: wanted.onboardingConcluidoEm }
        : {}),
    });
    const {
      metaPrazo: _a,
      pesoMetaKg: _b,
      metaIniciadaEm: _c,
      onboardingConcluidoEm: _d,
      ...rest
    } = wanted;
    const saved = (await persistProfile({ data: { profile: rest as Profile } })) as Profile;
    cache = withGoalOverlay(saved);
    return cache;
  }
}
