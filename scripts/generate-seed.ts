/**
 * Generates scripts/supabase-seed.sql from the in-repo starter data.
 * Run with: bun scripts/generate-seed.ts
 */
import { writeFileSync } from "node:fs";
import { exercises, profile, routines, workouts, workoutSets } from "../src/lib/data/mocks";

const USER = "demo";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (v: string[]): string =>
  v.length ? `array[${v.map(q).join(", ")}]::text[]` : `'{}'::text[]`;

const lines: string[] = [
  "-- Route — starter data. Run AFTER scripts/supabase-schema.sql.",
  "-- Safe to re-run: every insert upserts on the primary key.",
  "",
];

lines.push(
  `insert into public.profiles (id, user_id, nome, peso_kg, altura_cm, sexo, nivel_atividade, objetivo, meta_treinos_semana, equipment, avoid_exercises, session_length_min, preferred_time, check_in_mode, peso_inicial_kg, peso_meta_kg, meta_iniciada_em, meta_prazo) values (${[
    q(profile.id),
    q(USER),
    q(profile.nome),
    profile.pesoKg,
    profile.alturaCm,
    q(profile.sexo),
    q(profile.nivelAtividade),
    q(profile.objetivo),
    profile.metaTreinosSemana,
    arr(profile.equipment),
    `${q(JSON.stringify(profile.avoidExercises))}::jsonb`,
    profile.sessionLengthMin,
    q(profile.preferredTime),
    q(profile.checkInMode),
    q(profile.pesoInicialKg ?? null),
    q(profile.pesoMetaKg ?? null),
    q(profile.metaIniciadaEm ?? null),
    q(profile.metaPrazo ?? null),
  ].join(", ")}) on conflict (id) do nothing;`,
  "",
);

for (const e of exercises) {
  lines.push(
    `insert into public.exercises (id, user_id, nome, grupo_primario, grupos_secundarios, equipamento, instrucoes, is_custom) values (${[
      q(e.id),
      "null",
      q(e.nome),
      q(e.grupoPrimario),
      arr(e.gruposSecundarios),
      q(e.equipamento),
      q(e.instrucoes),
      false,
    ].join(", ")}) on conflict (id) do nothing;`,
  );
}
lines.push("");

for (const r of routines) {
  lines.push(
    `insert into public.routines (id, user_id, nome, descricao) values (${[
      q(r.id),
      q(USER),
      q(r.nome),
      q(r.descricao),
    ].join(", ")}) on conflict (id) do nothing;`,
  );
  for (const x of r.exercicios) {
    lines.push(
      `insert into public.routine_exercises (id, routine_id, exercise_id, ordem, series_alvo, reps_min, reps_max, descanso_seg, notas) values (${[
        q(x.id),
        q(r.id),
        q(x.exerciseId),
        x.ordem,
        x.seriesAlvo,
        x.repsMin,
        x.repsMax,
        x.descansoSeg,
        q(x.notas),
      ].join(", ")}) on conflict (id) do nothing;`,
    );
  }
}
lines.push("");

for (const w of workouts) {
  lines.push(
    `insert into public.workouts (id, user_id, routine_id, iniciado_em, finalizado_em, duracao_seg, volume_total_kg, notas, origem) values (${[
      q(w.id),
      q(USER),
      q(w.routineId ?? null),
      q(w.iniciadoEm),
      q(w.finalizadoEm ?? null),
      w.duracaoSeg,
      w.volumeTotalKg,
      q(w.notas),
      q(w.origem),
    ].join(", ")}) on conflict (id) do nothing;`,
  );
}
lines.push("");

for (const s of workoutSets) {
  lines.push(
    `insert into public.workout_sets (id, workout_id, exercise_id, ordem_exercicio, serie_num, tipo_serie, peso_kg, reps, rpe, concluida) values (${[
      q(s.id),
      q(s.workoutId),
      q(s.exerciseId),
      s.ordemExercicio,
      s.serieNum,
      q(s.tipoSerie),
      s.pesoKg,
      s.reps,
      s.rpe ?? "null",
      s.concluida,
    ].join(", ")}) on conflict (id) do nothing;`,
  );
}
lines.push("");

writeFileSync(new URL("./supabase-seed.sql", import.meta.url), lines.join("\n"));
console.log("wrote scripts/supabase-seed.sql");
