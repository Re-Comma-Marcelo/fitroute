import { createServerFn } from "@tanstack/react-start";

import type { CoachNote, Exercise, Profile, Routine, Workout, WorkoutSet } from "./types";
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
    exercicios: items
      .filter((i: Record<string, unknown>) => i["routine_id"] === r["id"])
      .map(toRoutineExercise),
  })) as unknown as Routine[];
});

export const persistRoutine = createServerFn({ method: "POST" })
  .inputValidator((data: { routine: Routine }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, uid, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    const r = data.routine;
    const id = r.id || uid("r");
    unwrap(
      await client
        .from("routines")
        .upsert(
          {
            id,
            user_id: DEMO_USER_ID,
            nome: r.nome,
            descricao: r.descricao,
            dias_semana: r.diasSemana ?? [],
          },
          { onConflict: "id" },
        )
        .select("id"),
    );
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
    return { ...r, id, exercicios } as Routine;
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
    const { db, requireUserId, uid, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    const w = data.workout;
    const id = w.id || uid("w");
    unwrap(
      await client
        .from("workouts")
        .upsert(
          {
            id,
            user_id: DEMO_USER_ID,
            routine_id: w.routineId ?? null,
            iniciado_em: w.iniciadoEm,
            finalizado_em: w.finalizadoEm ?? null,
            duracao_seg: w.duracaoSeg,
            volume_total_kg: w.volumeTotalKg,
            notas: w.notas,
            origem: w.origem,
          },
          { onConflict: "id" },
        )
        .select("id"),
    );
    unwrap(await client.from("workout_sets").delete().eq("workout_id", id).select("id"));
    if (data.sets.length) {
      unwrap(
        await client
          .from("workout_sets")
          .insert(
            data.sets.map((s, i) => ({
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
            })),
          )
          .select("id"),
      );
    }
    return { ...w, id } as Workout;
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

export const persistPlannedMeals = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      set: { date: string; slot: string; mealId: string }[];
      clear: { date: string; slot?: string }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const { db, requireUserId, unwrap } = await import("./db.server");
    const DEMO_USER_ID = await requireUserId();
    const client = db();
    for (const c of data.clear) {
      let query = client
        .from("meal_plan")
        .delete()
        .eq("user_id", DEMO_USER_ID)
        .eq("plan_date", c.date);
      if (c.slot) query = query.eq("slot", c.slot);
      unwrap(await query.select("meal_id"));
    }
    if (data.set.length) {
      unwrap(
        await client
          .from("meal_plan")
          .upsert(
            data.set.map((s) => ({
              user_id: DEMO_USER_ID,
              plan_date: s.date,
              slot: s.slot,
              meal_id: s.mealId,
            })),
            { onConflict: "user_id,plan_date,slot" },
          )
          .select("meal_id"),
      );
    }
    return { ok: true };
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
  const { db, requireUserId, unwrap } = await import("./db.server");
  const DEMO_USER_ID = await requireUserId();
  const rows = unwrap(
    await db()
      .from("tracked_lifts")
      .select("exercise_id")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at"),
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
  const { db, requireUserId, toCustomMeal, unwrap } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrap(
    await db()
      .from("custom_meals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
  return (rows as Record<string, unknown>[]).map(toCustomMeal);
});

export const persistCustomMeal = createServerFn({ method: "POST" })
  .inputValidator((data: { meal: Record<string, unknown>; source?: string }) => data)
  .handler(async ({ data }) => {
    const { db, requireUserId, toCustomMeal, uid, unwrap } = await import("./db.server");
    const userId = await requireUserId();
    const m = data.meal;
    const row = unwrap(
      await db()
        .from("custom_meals")
        .upsert(
          {
            id: (m["id"] as string) || uid("cm"),
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
          },
          { onConflict: "id" },
        )
        .select("*")
        .single(),
    ) as Record<string, unknown>;
    return toCustomMeal(row);
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
  const { db, requireUserId, unwrap } = await import("./db.server");
  const userId = await requireUserId();
  const rows = unwrap(
    await db().from("body_weight_log").select("*").eq("user_id", userId).order("data"),
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
