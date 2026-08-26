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

export async function getProfile(): Promise<Profile> {
  if (cache) return cache;
  const found = await fetchProfile();
  cache = (found as Profile | null) ?? FALLBACK;
  return cache;
}

export async function saveProfile(next: Profile): Promise<Profile> {
  const saved = await persistProfile({ data: { profile: { ...next, id: next.id || "p1" } } });
  cache = saved as Profile;
  return cache;
}
