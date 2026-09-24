import { createServerFn } from "@tanstack/react-start";

import type {
  CoachNote,
  Exercise,
  Profile,
  Routine,
  TrainingFolder,
  Workout,
  WorkoutSet,
} from "./types";
import type { MealSchedule, MealSlot, WeekPlan } from "./nutrition-types";

// Every handler loads the server-only Supabase module dynamically so this
// client-reachable module never pulls the service-role client into the browser.

export const fetchProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toProfile, unwrap } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const rows = unwrap(await db().from("profiles").select("*").eq("user_id", DEMO_USER_ID).limit(1));
  return (rows[0] ? toProfile(rows[0]) : null) as Profile | null;
});

export const persistProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { profile: Profile }) => data)
  .handler(async ({ data }) => {
    const { db, fromProfile, requireUserId, toProfile, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    const row = unwrap(
      await db()
        .from("profiles")
        .upsert(
          fromProfile(
            { ...(data.profile as unknown as Record<string, unknown>), id: userId },
            userId,
          ),
          { onConflict: "id" },
        )
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toProfile(row) as unknown as Profile;
  });

export const fetchExercises = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toExercise, unwrap } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrap(
    await db()
      .from("exercises")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("nome"),
  );
  return rows.map(toExercise) as unknown as Exercise[];
});

export const persistExercise = createServerFn({ method: "POST" })
  .inputValidator((data: { exercise: Omit<Exercise, "id" | "isCustom"> }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, toExercise, uid, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const e = data.exercise;
    const row = unwrap(
      await db()
        .from("exercises")
        .insert({
          id: uid("ex"),
          user_id: DEMO_USER_ID,
          nome: e.nome,
          grupo_primario: e.grupoPrimario,
          grupos_secundarios: e.gruposSecundarios,
          equipamento: e.equipamento,
          instrucoes: e.instrucoes,
          midia_url: e.midiaUrl ?? null,
          is_custom: true,
        })
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toExercise(row) as unknown as Exercise;
  });

export const fetchRoutines = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toRoutineExercise, unwrap } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const client = db();
  const routines = unwrap(
    await client.from("routines").select("*").eq("user_id", DEMO_USER_ID).order("created_at"),
  );
  const items = unwrap(await client.from("routine_exercises").select("*").order("ordem"));
  return routines.map((r: Record<string, unknown>) => ({
    id: String(r["id"]),
    nome: String(r["nome"]),
    descricao: String(r["descricao"] ?? ""),
    diasSemana: ((r["dias_semana"] ?? []) as number[]).map(Number),
    folderId: r["folder_id"] ?? undefined,
    papel: r["papel"] ?? "padrao",
    variacaoDe: r["variacao_de"] ?? undefined,
    motivo: r["motivo"] ?? undefined,
    exercicios: items
      .filter((i: Record<string, unknown>) => i["routine_id"] === r["id"])
      .map(toRoutineExercise),
  })) as unknown as Routine[];
});

export const persistRoutine = createServerFn({ method: "POST" })
  .inputValidator((data: { routine: Routine }) => data)
  .handler(async ({ data }) => {
    const { currentFolderId, db, requireUserId, uid, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    const r = data.routine;
    const id = r.id || uid("r");
    const base = { id, user_id: DEMO_USER_ID, nome: r.nome, descricao: r.descricao };
    const withDays = { ...base, dias_semana: r.diasSemana ?? [] };
    // Folder columns are only sent when set, so a caller that never heard of
    // folders cannot move a routine out of one.
    const withFolder = {
      ...withDays,
      ...(r.folderId !== undefined ? { folder_id: r.folderId } : {}),
      ...(r.papel !== undefined ? { papel: r.papel } : {}),
      ...(r.variacaoDe !== undefined ? { variacao_de: r.variacaoDe } : {}),
      ...(r.motivo !== undefined ? { motivo: r.motivo } : {}),
    };
    // dias_semana and the folder columns come from later migrations; fall back when missing.
    let saved = await client.from("routines").upsert(withFolder, { onConflict: "id" }).select("id");
    if (saved.error) {
      saved = await client.from("routines").upsert(withDays, { onConflict: "id" }).select("id");
    }
    if (saved.error) {
      unwrap(await client.from("routines").upsert(base, { onConflict: "id" }).select("id"));
    }
    // A routine with no folder yet lands in the current one.
    let folderId = r.folderId;
    if (folderId === undefined) {
      const current = await currentFolderId(DEMO_USER_ID);
      if (current) {
        await client
          .from("routines")
          .update({ folder_id: current })
          .eq("id", id)
          .is("folder_id", null)
          .select("id");
        folderId = current;
      }
    }
    unwrap(await client.from("routine_exercises").delete().eq("routine_id", id).select("id"));
    const exercicios = r.exercicios.map((e, i) => ({ ...e, ordem: i, id: e.id || uid("rex") }));
    if (exercicios.length) {
      unwrap(
        await client
          .from("routine_exercises")
          .insert(
            exercicios.map((e) => ({
              id: e.id,
              routine_id: id,
              exercise_id: e.exerciseId,
              ordem: e.ordem,
              series_alvo: e.seriesAlvo,
              reps_min: e.repsMin,
              reps_max: e.repsMax,
              descanso_seg: e.descansoSeg,
              notas: e.notas,
            })),
          )
          .select("id"),
      );
    }
    return {
      ...r,
      id,
      exercicios,
      ...(folderId !== undefined ? { folderId } : {}),
    } as Routine;
  });

export const removeRoutine = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    unwrap(
      await db().from("routines").delete().eq("id", data.id).eq("user_id", userId).select("id"),
    );
    return { ok: true };
  });

export const fetchWorkoutLog = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toSet, toWorkout, unwrap } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const client = db();
  const workouts = unwrap(
    await client
      .from("workouts")
      .select("*")
      .eq("user_id", DEMO_USER_ID)
      .order("iniciado_em", { ascending: false }),
  );
  const ids = workouts.map((w: Record<string, unknown>) => String(w["id"]));
  const sets = ids.length
    ? unwrap(await client.from("workout_sets").select("*").in("workout_id", ids))
    : [];
  return {
    workouts: workouts.map(toWorkout) as unknown as Workout[],
    sets: sets.map(toSet) as unknown as WorkoutSet[],
  };
});

export const persistWorkout = createServerFn({ method: "POST" })
  .inputValidator((data: { workout: Workout; sets: WorkoutSet[] }) => data)
  .handler(async ({ data }) => {
    const { currentFolderId, db, requireUserId, uid, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    const w = data.workout;
    const id = w.id || uid("w");
    const base = {
      id,
      user_id: DEMO_USER_ID,
      routine_id: w.routineId ?? null,
      iniciado_em: w.iniciadoEm,
      finalizado_em: w.finalizadoEm ?? null,
      duracao_seg: w.duracaoSeg,
      volume_total_kg: w.volumeTotalKg,
      notas: w.notas,
      origem: w.origem,
    };
    // Folder columns come from the folders migration and are only sent when
    // set, so re-saving an old workout never moves it to another folder.
    const withFolder = {
      ...base,
      ...(w.folderId !== undefined ? { folder_id: w.folderId } : {}),
      ...(w.variacao !== undefined ? { variacao: w.variacao } : {}),
      ...(w.motivo !== undefined ? { motivo: w.motivo } : {}),
    };
    const saved = await client
      .from("workouts")
      .upsert(withFolder, { onConflict: "id" })
      .select("id");
    if (saved.error) {
      unwrap(await client.from("workouts").upsert(base, { onConflict: "id" }).select("id"));
    }
    // A session with no folder yet belongs to the one that is current now.
    let folderId = w.folderId;
    if (folderId === undefined) {
      const current = await currentFolderId(DEMO_USER_ID);
      if (current) {
        await client
          .from("workouts")
          .update({ folder_id: current })
          .eq("id", id)
          .is("folder_id", null)
          .select("id");
        folderId = current;
      }
    }
    unwrap(await client.from("workout_sets").delete().eq("workout_id", id).select("id"));
    if (data.sets.length) {
      const rows = data.sets.map((s, i) => ({
        id: s.id || `${id}s${i}`,
        workout_id: id,
        exercise_id: s.exerciseId,
        ordem_exercicio: s.ordemExercicio,
        serie_num: s.serieNum,
        tipo_serie: s.tipoSerie,
        peso_kg: s.pesoKg,
        reps: s.reps,
        rpe: s.rpe ?? null,
        concluida: s.concluida,
      }));
      const withNote = rows.map((r, i) => ({ ...r, coach_note: data.sets[i]?.coachNote ?? "" }));
      const withSwap = withNote.map((r, i) => ({
        ...r,
        substitui_exercise_id: data.sets[i]?.substituiExerciseId ?? null,
      }));
      // coach_note (coaching migration) and substitui_exercise_id (folders
      // migration) may be missing; fall back one column set at a time.
      let inserted = await client.from("workout_sets").insert(withSwap).select("id");
      if (inserted.error) {
        inserted = await client.from("workout_sets").insert(withNote).select("id");
      }
      if (inserted.error) {
        unwrap(await client.from("workout_sets").insert(rows).select("id"));
      }
    }

    return { ...w, id, ...(folderId !== undefined ? { folderId } : {}) } as Workout;
  });

// ---- training folders -------------------------------------------------------

/**
 * The user's folders, oldest first. The first call creates the current folder
 * (named `defaultName`) and files every existing routine and session in it;
 * later calls adopt routines created elsewhere (e.g. over MCP) into the
 * current folder. Returns [] until the folders migration has been applied.
 */
export const loadFolders = createServerFn({ method: "POST" })
  .inputValidator((data: { defaultName: string }) => data)
  .handler(async ({ data }) => {
    const { db, isMissingTable, requireUserId, toFolder, uid, unwrap } =
      await import("./db.server");
    const userId = await requireUserId();
    const client = db();
    const res = await client
      .from("training_folders")
      .select("*")
      .eq("user_id", userId)
      .order("inicio_em");
    if (res.error) {
      if (isMissingTable(res.error)) return [] as TrainingFolder[];
      throw new Error(res.error.message);
    }
    let rows = (res.data ?? []) as Record<string, unknown>[];

    if (!rows.length) {
      // First run: the whole history so far becomes the first folder.
      const first = unwrap(
        await client
          .from("workouts")
          .select("iniciado_em")
          .eq("user_id", userId)
          .order("iniciado_em")
          .limit(1),
      ) as Record<string, unknown>[];
      const created = unwrap(
        await client
          .from("training_folders")
          .insert({
            id: uid("pf"),
            user_id: userId,
            nome: data.defaultName.trim() || "My training",
            status: "atual",
            inicio_em: first[0]?.["iniciado_em"] ?? new Date().toISOString(),
          })
          .select("*"),
      ) as Record<string, unknown>[];
      const folderId = String(created[0]?.["id"]);
      await client
        .from("workouts")
        .update({ folder_id: folderId })
        .eq("user_id", userId)
        .is("folder_id", null)
        .select("id");
      rows = created;
    }

    const current = rows.find((r) => r["status"] === "atual");
    if (current) {
      await client
        .from("routines")
        .update({ folder_id: current["id"] })
        .eq("user_id", userId)
        .is("folder_id", null)
        .select("id");
    }
    return rows.map(toFolder) as unknown as TrainingFolder[];
  });

/** Create or update a folder. Making one current archives the previous current one. */
export const persistFolder = createServerFn({ method: "POST" })
  .inputValidator((data: { folder: TrainingFolder }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, toFolder, uid, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    const client = db();
    const f = data.folder;
    const id = f.id || uid("pf");
    if (f.id) {
      const owner = unwrap(
        await client.from("training_folders").select("user_id").eq("id", f.id).limit(1),
      ) as Record<string, unknown>[];
      if (owner[0] && owner[0]["user_id"] !== userId) {
        throw new Response("Forbidden", { status: 403 });
      }
    }
    if (f.status === "atual") {
      unwrap(
        await client
          .from("training_folders")
          .update({ status: "arquivada", fim_em: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("status", "atual")
          .neq("id", id)
          .select("id"),
      );
    }
    const row = unwrap(
      await client
        .from("training_folders")
        .upsert(
          {
            id,
            user_id: userId,
            nome: f.nome,
            status: f.status,
            origem_modelo_id: f.origemModeloId ?? null,
            inicio_em: f.inicioEm || new Date().toISOString(),
            fim_em: f.status === "atual" ? null : (f.fimEm ?? null),
          },
          { onConflict: "id" },
        )
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toFolder(row) as unknown as TrainingFolder;
  });

export const removeWorkout = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    unwrap(
      await db().from("workouts").delete().eq("id", data.id).eq("user_id", userId).select("id"),
    );
    return { ok: true };
  });

export const fetchCoachNotes = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toCoachNote, unwrap } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const rows = unwrap(
    await db()
      .from("coach_notes")
      .select("*")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at", { ascending: false }),
  );
  return rows.map(toCoachNote) as unknown as CoachNote[];
});

export const persistCoachNote = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: string; content: string; tags: string[] }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, toCoachNote, uid, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const row = unwrap(
      await db()
        .from("coach_notes")
        .insert({
          id: uid("cn"),
          user_id: DEMO_USER_ID,
          kind: data.kind,
          content: data.content,
          tags: data.tags,
        })
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toCoachNote(row) as unknown as CoachNote;
  });

export const fetchNutritionState = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, unwrap } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const client = db();
  const planRows = unwrap(await client.from("meal_plan").select("*").eq("user_id", DEMO_USER_ID));
  const scheduleRows = unwrap(
    await client.from("meal_schedule").select("*").eq("user_id", DEMO_USER_ID),
  );
  const checkedRows = unwrap(
    await client.from("shopping_checked").select("item_key").eq("user_id", DEMO_USER_ID),
  );
  const plan: WeekPlan = {};
  for (const r of planRows as Record<string, unknown>[]) {
    const date = String(r["plan_date"]);
    plan[date] = { ...(plan[date] ?? {}), [String(r["slot"])]: String(r["meal_id"]) };
  }
  const schedule: Partial<Record<string, { time: string; enabled: boolean }>> = {};
  for (const r of scheduleRows as Record<string, unknown>[]) {
    schedule[String(r["slot"])] = {
      time: String(r["slot_time"]),
      enabled: Boolean(r["enabled"]),
    };
  }
  return {
    plan,
    schedule,
    checked: (checkedRows as Record<string, unknown>[]).map((r) => String(r["item_key"])),
  };
});

export const persistMealSchedule = createServerFn({ method: "POST" })
  .inputValidator((data: { schedule: MealSchedule }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    unwrap(
      await db()
        .from("meal_schedule")
        .upsert(
          Object.entries(data.schedule).map(([slot, v]) => ({
            user_id: DEMO_USER_ID,
            slot,
            slot_time: v.time,
            enabled: v.enabled,
          })),
          { onConflict: "user_id,slot" },
        )
        .select("slot"),
    );
    return { ok: true };
  });

export const persistCheckedItem = createServerFn({ method: "POST" })
  .inputValidator((data: { key: string; checked: boolean }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    if (data.checked) {
      unwrap(
        await client
          .from("shopping_checked")
          .upsert({ user_id: DEMO_USER_ID, item_key: data.key }, { onConflict: "user_id,item_key" })
          .select("item_key"),
      );
    } else {
      unwrap(
        await client
          .from("shopping_checked")
          .delete()
          .eq("user_id", DEMO_USER_ID)
          .eq("item_key", data.key)
          .select("item_key"),
      );
    }
    return { ok: true };
  });

export const fetchTrackedLifts = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, unwrapSoft } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("tracked_lifts")
      .select("exercise_id")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at"),
    [] as Record<string, unknown>[],
  );
  return (rows as Record<string, unknown>[]).map((r) => String(r["exercise_id"]));
});

export const persistTrackedLift = createServerFn({ method: "POST" })
  .inputValidator((data: { exerciseId: string; tracked: boolean }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    if (data.tracked) {
      unwrap(
        await client
          .from("tracked_lifts")
          .upsert(
            { user_id: DEMO_USER_ID, exercise_id: data.exerciseId },
            { onConflict: "user_id,exercise_id" },
          )
          .select("exercise_id"),
      );
    } else {
      unwrap(
        await client
          .from("tracked_lifts")
          .delete()
          .eq("user_id", DEMO_USER_ID)
          .eq("exercise_id", data.exerciseId)
          .select("exercise_id"),
      );
    }
    return { ok: true };
  });

export const fetchCustomMeals = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toCustomMeal, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("custom_meals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    [] as Record<string, unknown>[],
  );
  return (rows as Record<string, unknown>[]).map(toCustomMeal);
});

export const persistCustomMeal = createServerFn({ method: "POST" })
  .inputValidator((data: { meal: Record<string, unknown>; source?: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, toCustomMeal, uid, unwrap, isMissingTable } =
      await import("./db.server");
    const userId = await requireUserId();
    const m = data.meal;
    const id = (m["id"] as string) || uid("cm");
    const rowInput = {
      id,
      user_id: userId,
      nome: m["name"],
      slots: m["slots"] ?? [],
      kcal: Math.round(Number(m["kcal"] ?? 0)),
      protein_g: Math.round(Number(m["proteinG"] ?? 0)),
      carbs_g: Math.round(Number(m["carbsG"] ?? 0)),
      fat_g: Math.round(Number(m["fatG"] ?? 0)),
      prep_min: Math.round(Number(m["prepMin"] ?? 0)),
      tags: m["tags"] ?? [],
      ingredients: m["ingredients"] ?? [],
      order_out: Boolean(m["orderOut"]),
      source: data.source ?? "text",
    };
    try {
      const row = unwrap(
        await db().from("custom_meals").upsert(rowInput, { onConflict: "id" }).select("*").single(),
      ) as Record<string, unknown>;
      return toCustomMeal(row);
    } catch (err) {
      // Table not migrated yet — return the meal as-is so the client can
      // persist it locally. Keeps "Add a meal" working without the migration.
      if (isMissingTable(err as { message?: string } | null)) {
        return toCustomMeal(rowInput as unknown as Record<string, unknown>);
      }
      throw err;
    }
  });

export const deleteCustomMeal = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    unwrap(
      await db().from("custom_meals").delete().eq("user_id", userId).eq("id", data.id).select("id"),
    );
    return { ok: true };
  });

export type { MealSlot };

export const fetchBodyWeightLog = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db().from("body_weight_log").select("*").eq("user_id", userId).order("data"),
    [] as Record<string, unknown>[],
  ) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r["id"]),
    data: String(r["data"]),
    pesoKg: Number(r["peso_kg"] ?? 0),
  }));
});

export const persistBodyWeight = createServerFn({ method: "POST" })
  .inputValidator((data: { data: string; pesoKg: number }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    const row = unwrap(
      await db()
        .from("body_weight_log")
        .upsert(
          {
            id: `${userId}:${data.data}`,
            user_id: userId,
            data: data.data,
            peso_kg: data.pesoKg,
          },
          { onConflict: "user_id,data" },
        )
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return { id: String(row["id"]), data: String(row["data"]), pesoKg: Number(row["peso_kg"]) };
  });

// ---- adaptive coaching layer ----------------------------------------------
// These tables come from scripts/supabase-migration-coaching.sql. Callers in
// src/lib/data/coaching.ts fall back to local storage when they are missing,
// so the app keeps working before the migration is applied.

export const fetchCoachingEvents = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toCoachingEvent, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("coaching_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
    [] as Record<string, unknown>[],
  ) as Record<string, unknown>[];
  return rows.map(toCoachingEvent);
});

export const persistCoachingEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      kind: string;
      message: string;
      exerciseId?: string | undefined;
      workoutId?: string | undefined;
      cause?: string | undefined;
      detail?: Record<string, string | number | boolean | null> | undefined;
    }) => data,
  )

  .handler(async ({ data }) => {
    const { db, requireUserId, toCoachingEvent, uid, isMissingTable } = await import("./db.server");
    const userId = await requireUserId();
    const res = await db()
      .from("coaching_events")
      .insert({
        id: uid("ce"),
        user_id: userId,
        kind: data.kind,
        message: data.message,
        exercise_id: data.exerciseId ?? null,
        workout_id: data.workoutId ?? null,
        cause: data.cause ?? null,
        detail: data.detail ?? {},
      })
      .select("*")
      .single();
    // The coaching tables are optional: without the migration the client keeps
    // the event locally instead of crashing the screen.
    if (res.error) {
      if (isMissingTable(res.error)) return null;
      throw new Error(res.error.message);
    }
    return toCoachingEvent(res.data as Record<string, unknown>);
  });

export const persistCoachingReply = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; reply: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    unwrap(
      await db()
        .from("coaching_events")
        .update({ user_reply: data.reply })
        .eq("user_id", userId)
        .eq("id", data.id)
        .select("id"),
    );
    return { ok: true };
  });

export const fetchCrossTraining = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toCrossTraining, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("cross_training_logs")
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .limit(60),
    [] as Record<string, unknown>[],
  ) as Record<string, unknown>[];
  return rows.map(toCrossTraining);
});

export const persistCrossTraining = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { kind: string; data: string; duracaoMin: number; intensidade: string; nota: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const { db, requireUserId, toCrossTraining, uid, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    const row = unwrap(
      await db()
        .from("cross_training_logs")
        .insert({
          id: uid("ct"),
          user_id: userId,
          kind: data.kind,
          data: data.data,
          duracao_min: data.duracaoMin,
          intensidade: data.intensidade,
          nota: data.nota,
        })
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toCrossTraining(row);
  });

export const removeCrossTraining = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    unwrap(
      await db()
        .from("cross_training_logs")
        .delete()
        .eq("user_id", userId)
        .eq("id", data.id)
        .select("id"),
    );
    return { ok: true };
  });

export const fetchCoachChat = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, toChatEntry, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("coach_chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    [] as Record<string, unknown>[],
  ) as Record<string, unknown>[];
  return rows.map(toChatEntry).reverse();
});

export const persistCoachChat = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { role: string; content: string; workoutId?: string; exerciseId?: string }) => data,
  )
  .handler(async ({ data }) => {
    const { db, requireUserId, toChatEntry, uid, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    const row = unwrap(
      await db()
        .from("coach_chat_messages")
        .insert({
          id: uid("cc"),
          user_id: userId,
          role: data.role,
          content: data.content,
          workout_id: data.workoutId ?? null,
          exercise_id: data.exerciseId ?? null,
        })
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toChatEntry(row);
  });

// ---- route (checkpoints + progress photos) ---------------------------------
// Tolerant: when the route migration has not run yet, reads return empty and
// writes return null so the client keeps the route on the device.

type CheckpointInput = {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  orderIndex: number;
  status: string;
  source: string;
  adjustmentReason?: string;
  achievedAt?: string;
  metric?: unknown;
  createdAt: string;
  updatedAt: string;
};

const toCheckpoint = (r: Record<string, unknown>) => ({
  id: String(r["id"]),
  title: String(r["title"] ?? ""),
  description: (r["description"] as string | null) ?? undefined,
  targetDate: String(r["target_date"] ?? "").slice(0, 10),
  orderIndex: Number(r["order_index"] ?? 0),
  status: String(r["status"] ?? "upcoming"),
  source: String(r["source"] ?? "user_created"),
  adjustmentReason: (r["adjustment_reason"] as string | null) ?? undefined,
  achievedAt: (r["achieved_at"] as string | null) ?? undefined,
  metric: (r["metric"] as unknown) ?? undefined,
  createdAt: String(r["created_at"] ?? new Date().toISOString()),
  updatedAt: String(r["updated_at"] ?? new Date().toISOString()),
});

export const fetchRouteCheckpoints = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("route_checkpoints")
      .select("*")
      .eq("user_id", userId)
      .order("target_date", { ascending: true }),
    [] as Record<string, unknown>[],
  ) as Record<string, unknown>[];
  return rows.map(toCheckpoint);
});

export const persistRouteCheckpoint = createServerFn({ method: "POST" })
  .inputValidator((data: CheckpointInput) => data)
  .handler(async ({ data }) => {
    const { db, isMissingTable, requireUserId } = await import("./db.server");
    const userId = await requireUserId();
    const res = await db()
      .from("route_checkpoints")
      .upsert(
        {
          id: data.id,
          user_id: userId,
          title: data.title,
          description: data.description ?? null,
          target_date: data.targetDate,
          order_index: data.orderIndex,
          status: data.status,
          source: data.source,
          adjustment_reason: data.adjustmentReason ?? null,
          achieved_at: data.achievedAt ?? null,
          metric: data.metric ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();
    if (res.error) {
      if (isMissingTable(res.error)) return null;
      throw new Error(res.error.message);
    }
    return toCheckpoint(res.data as Record<string, unknown>);
  });

export const deleteRouteCheckpoint = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db, isMissingTable, requireUserId } = await import("./db.server");
    const userId = await requireUserId();
    const res = await db()
      .from("route_checkpoints")
      .delete()
      .eq("user_id", userId)
      .eq("id", data.id);
    if (res.error && !isMissingTable(res.error)) throw new Error(res.error.message);
    return { ok: true };
  });

export const fetchRoutePhotos = createServerFn({ method: "GET" }).handler(async () => {
  const { db, requireUserId, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db()
      .from("route_progress_photos")
      .select("*")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(60),
    [] as Record<string, unknown>[],
  ) as Record<string, unknown>[];
  const out: {
    id: string;
    checkpointId: string | null;
    url: string;
    takenAt: string;
    visibleToAi: boolean;
    createdAt: string;
  }[] = [];
  for (const r of rows) {
    const path = String(r["storage_path"] ?? "");
    const signed = await db()
      .storage.from("route-photos")
      .createSignedUrl(path, 60 * 60);
    out.push({
      id: String(r["id"]),
      checkpointId: (r["checkpoint_id"] as string | null) ?? null,
      url: signed.data?.signedUrl ?? "",
      takenAt: String(r["taken_at"]),
      visibleToAi: Boolean(r["visible_to_ai"]),
      createdAt: String(r["created_at"] ?? r["taken_at"]),
    });
  }
  return out.filter((p) => p.url);
});

export const persistRoutePhoto = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      dataUrl: string;
      checkpointId: string | null;
      visibleToAi: boolean;
      takenAt: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, isMissingTable, requireUserId, uid } = await import("./db.server");
    const userId = await requireUserId();
    const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(data.dataUrl);
    if (!match) throw new Error("Unsupported image data.");
    const contentType = match[1]!;
    const bytes = Buffer.from(match[2]!, "base64");
    const id = uid("ph");
    const path = `${userId}/${id}.jpg`;

    const upload = await db()
      .storage.from("route-photos")
      .upload(path, bytes, { contentType, upsert: true });
    if (upload.error) return null; // bucket missing -> keep the photo on device

    const res = await db()
      .from("route_progress_photos")
      .insert({
        id,
        user_id: userId,
        checkpoint_id: data.checkpointId,
        storage_path: path,
        taken_at: data.takenAt,
        visible_to_ai: data.visibleToAi,
      })
      .select("*")
      .single();
    if (res.error) {
      if (isMissingTable(res.error)) return null;
      throw new Error(res.error.message);
    }
    const signed = await db()
      .storage.from("route-photos")
      .createSignedUrl(path, 60 * 60);
    return {
      id,
      checkpointId: data.checkpointId,
      url: signed.data?.signedUrl ?? data.dataUrl,
      takenAt: data.takenAt,
      visibleToAi: data.visibleToAi,
      createdAt: new Date().toISOString(),
    };
  });

// ---- Meal entries (flexible diary; tolerant of a missing table) ------------

export const fetchMealEntries = createServerFn({ method: "POST" })
  .inputValidator((data: { date: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrapSoft } = await import("./db.server");
    const userId = await requireUserId();
    const rows = unwrapSoft(
      await db().from("meal_entries").select("*").eq("user_id", userId).eq("entry_date", data.date),
      [] as Record<string, unknown>[],
    );
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r["id"]),
      date: String(r["entry_date"]),
      slot: String(r["slot"]),
      mealId: String(r["meal_id"]),
      time: r["entry_time"] ? String(r["entry_time"]) : undefined,
      portion: r["portion"] == null ? 1 : Number(r["portion"]),
      planned: Boolean(r["planned"]),
      eaten: Boolean(r["eaten"]),
      createdAt: String(r["created_at"] ?? new Date().toISOString()),
    }));
  });

/** Entries across a date range — one round trip for week views and totals. */
export const fetchMealEntriesRange = createServerFn({ method: "POST" })
  .inputValidator((data: { from: string; to: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrapSoft } = await import("./db.server");
    const userId = await requireUserId();
    const rows = unwrapSoft(
      await db()
        .from("meal_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", data.from)
        .lte("entry_date", data.to),
      [] as Record<string, unknown>[],
    );
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r["id"]),
      date: String(r["entry_date"]),
      slot: String(r["slot"]),
      mealId: String(r["meal_id"]),
      time: r["entry_time"] ? String(r["entry_time"]) : undefined,
      portion: r["portion"] == null ? 1 : Number(r["portion"]),
      planned: Boolean(r["planned"]),
      eaten: Boolean(r["eaten"]),
      createdAt: String(r["created_at"] ?? new Date().toISOString()),
    }));
  });

export const persistMealEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      date: string;
      slot: string;
      mealId: string;
      time?: string | undefined;
      portion?: number | undefined;
      planned: boolean;
      eaten: boolean;
      createdAt: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, requireUserId, isMissingTable } = await import("./db.server");
    const userId = await requireUserId();
    const res = await db()
      .from("meal_entries")
      .upsert(
        {
          id: data.id,
          user_id: userId,
          entry_date: data.date,
          slot: data.slot,
          meal_id: data.mealId,
          entry_time: data.time ?? null,
          portion: data.portion && data.portion > 0 ? data.portion : 1,
          planned: data.planned,
          eaten: data.eaten,
          created_at: data.createdAt,
        },
        { onConflict: "id" },
      )
      .select("id");
    if (res.error && !isMissingTable(res.error)) throw new Error(res.error.message);
    return { ok: true, synced: !res.error };
  });

export const deleteMealEntry = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, isMissingTable } = await import("./db.server");
    const userId = await requireUserId();
    const res = await db()
      .from("meal_entries")
      .delete()
      .eq("user_id", userId)
      .eq("id", data.id)
      .select("id");
    if (res.error && !isMissingTable(res.error)) throw new Error(res.error.message);
    return { ok: true };
  });

// ---- weekly meal selection (optional `week_menu` table) ---------------------

export const fetchWeekMenu = createServerFn({ method: "GET" })
  .inputValidator((data: { weekStart: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrapSoft } = await import("./db.server");
    const userId = await requireUserId();
    const rows = unwrapSoft(
      await db()
        .from("week_menu")
        .select("meal_id, completed_at")
        .eq("user_id", userId)
        .eq("week_start", data.weekStart),
      [] as Record<string, unknown>[],
    );
    const list = rows as Record<string, unknown>[];
    return {
      mealIds: list.map((r) => String(r["meal_id"])),
      completedAt: list.find((r) => r["completed_at"])?.["completed_at"]
        ? String(list.find((r) => r["completed_at"])!["completed_at"])
        : null,
    };
  });

export const persistWeekMenu = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { weekStart: string; mealIds: string[]; completedAt?: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const { db, requireUserId, isMissingTable } = await import("./db.server");
    const userId = await requireUserId();
    const del = await db()
      .from("week_menu")
      .delete()
      .eq("user_id", userId)
      .eq("week_start", data.weekStart)
      .select("id");
    if (del.error) {
      if (isMissingTable(del.error)) return { ok: true, synced: false };
      throw new Error(del.error.message);
    }
    if (!data.mealIds.length) return { ok: true, synced: true };
    const res = await db()
      .from("week_menu")
      .insert(
        data.mealIds.map((mealId) => ({
          user_id: userId,
          week_start: data.weekStart,
          meal_id: mealId,
          completed_at: data.completedAt ?? null,
        })),
      )
      .select("id");
    if (res.error && !isMissingTable(res.error)) throw new Error(res.error.message);
    return { ok: true, synced: !res.error };
  });

// ---- Weekly check-ins -------------------------------------------------------

export const fetchWeeklyCheckIns = createServerFn({ method: "POST" }).handler(async () => {
  const { db, requireUserId, unwrapSoft } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrapSoft(
    await db().from("weekly_checkins").select("*").eq("user_id", userId),
    [] as Record<string, unknown>[],
  );
  return (rows as Record<string, unknown>[]).map((r) => ({
    weekKey: String(r["week_key"]),
    completedAt: String(r["created_at"] ?? new Date().toISOString()),
    feeling: (r["feeling"] ?? "ok") as string,
    lifeNote: String(r["life_note"] ?? ""),
    days: (r["chosen_days"] ?? []) as number[],
    issues: (r["issues"] ?? []) as string[],
    issueNote: "",
    weightKg: r["weight_kg"] == null ? null : Number(r["weight_kg"]),
  }));
});

export const persistWeeklyCheckIn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      weekKey: string;
      feeling: string;
      lifeNote: string;
      days: number[];
      issues: string[];
      weightKg: number | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, requireUserId, isMissingTable } = await import("./db.server");
    const userId = await requireUserId();
    const res = await db()
      .from("weekly_checkins")
      .upsert(
        {
          user_id: userId,
          week_key: data.weekKey,
          feeling: data.feeling,
          life_note: data.lifeNote,
          chosen_days: data.days,
          issues: data.issues,
          weight_kg: data.weightKg,
        },
        { onConflict: "user_id,week_key" },
      )
      .select("user_id");
    if (res.error && !isMissingTable(res.error)) throw new Error(res.error.message);
    return { ok: true, synced: !res.error };
  });
