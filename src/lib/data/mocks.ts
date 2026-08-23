import type { Exercise, Profile, Routine, Workout, WorkoutSet } from "../types";

// In-memory mock. NEVER import this file directly in components —
// use only functions from src/lib/data/*.

const ex = (
  id: string,
  nome: string,
  grupoPrimario: string,
  gruposSecundarios: string[],
  equipamento: string,
  instrucoes: string,
): Exercise => ({
  id,
  nome,
  grupoPrimario,
  gruposSecundarios,
  equipamento,
  instrucoes,
  isCustom: false,
});

export const exercises: Exercise[] = [
  ex("e1", "Bench Press", "Chest", ["Triceps", "Shoulders"], "Barbell", "Lie on the bench with feet flat on the floor and grip the bar at shoulder width. Lower with control to the mid-chest. Press back up without locking your elbows.",
  ),
  ex("e2", "Incline Dumbbell Press", "Chest", ["Shoulders", "Triceps"], "Dumbbells", "Set the bench between 30 and 45 degrees and hold the dumbbells at chest height. Lower until you feel a stretch in the upper chest. Press up, lightly bringing the dumbbells together at the top.",
  ),
  ex("e3", "Decline Bench Press", "Chest", ["Triceps"], "Barbell", "Set the bench to decline and secure your legs. Lower the bar toward the lower chest. Press back up keeping your wrists aligned.",
  ),
  ex("e4", "Pec Deck Machine", "Chest", ["Shoulders"], "Machine", "Sit with your back supported and hold the handles at chest height. Bring your arms together in a slow arc, squeezing the chest. Return under control, feeling the stretch.",
  ),
  ex("e5", "Cable Crossover", "Chest", ["Shoulders"], "Cable", "Stand in the center of the cable with one foot slightly forward. Bring your hands forward and down, crossing them slightly. Return slowly without letting your shoulders rise.",
  ),
  ex("e6", "Push-up", "Chest", ["Triceps", "Core"], "Bodyweight", "Place your hands slightly wider than shoulder width and keep your body straight. Lower until your chest almost touches the floor. Press back up while keeping your core tight.",
  ),
  ex("e7", "Barbell Squat", "Quads", ["Glutes", "Core", "Hamstrings"], "Barbell", "Rest the bar on your upper back, feet shoulder-width apart, chest up. Lower by pushing your hips back until your thighs break parallel. Press up through the middle of your foot.",
  ),
  ex("e8", "Front Squat", "Quads", ["Glutes", "Core"], "Barbell", "Hold the bar on the front delts with elbows high. Lower while keeping your torso as upright as possible. Drive up without letting your elbows drop.",
  ),
  ex("e9", "Leg Press", "Quads", ["Glutes"], "Machine", "Place your feet on the platform shoulder-width apart and release the safety. Lower until your knees reach about 90 degrees. Press without fully locking your knees.",
  ),
  ex("e10", "Leg Extension", "Quads", [], "Machine", "Adjust the seat so your knee aligns with the machine axis. Extend your legs until just short of lockout, squeezing the quads. Lower under control for two seconds.",
  ),
  ex("e11", "Dumbbell Lunge", "Quads", ["Glutes", "Hamstrings"], "Dumbbells", "Hold a dumbbell in each hand and step forward. Lower until your back knee nearly touches the floor. Push back up through the front leg.",
  ),
  ex("e12", "Bulgarian Split Squat", "Quads", ["Glutes"], "Dumbbells", "Rest your back foot on a bench and keep your torso slightly leaned forward. Lower until you feel the glute stretch. Rise through the front leg without bouncing.",
  ),
  ex("e13", "Hack Squat", "Quads", ["Glutes"], "Machine", "Set your shoulders on the pads and keep your back supported. Lower your hips under control. Press through the middle of your foot.",
  ),
  ex("e14", "Deadlift", "Hamstrings", ["Glutes", "Lower back", "Traps"], "Barbell", "With the bar over mid-foot, grip with a neutral spine and chest up. Lift by pushing the floor away and extending hips and knees together. Lower keeping the bar close to your legs.",
  ),
  ex("e15", "Romanian Deadlift", "Hamstrings", ["Glutes", "Lower back"], "Barbell", "Hold the bar in front with knees slightly bent. Push your hips back, lowering the bar along your legs. Rise by contracting glutes and hamstrings.",
  ),
  ex("e16", "Lying Leg Curl", "Hamstrings", ["Calves"], "Machine", "Lie face down with the pad above the Achilles. Curl your heels toward your glutes. Lower slowly without dropping the weight.",
  ),
  ex("e17", "Seated Leg Curl", "Hamstrings", [], "Machine", "Sit with your back supported and the pad over your lower calf. Curl your feet down and back, squeezing the hamstrings. Return under control.",
  ),
  ex("e18", "Hip Thrust", "Glutes", ["Hamstrings", "Core"], "Barbell", "Rest your upper back on a bench with the bar over your hips. Thrust your hips up until your torso and thighs align. Squeeze your glutes for one second at the top.",
  ),
  ex("e19", "Hip Abduction Machine", "Glutes", [], "Machine", "Sit with the pads on the outside of your thighs. Open your legs to a comfortable range. Return while resisting the weight.",
  ),
  ex("e20", "Standing Calf Raise", "Calves", [], "Machine", "Place the balls of your feet on the platform with knees extended. Rise onto your toes as high as possible. Lower until you feel a full stretch.",
  ),
  ex("e21", "Seated Calf Raise", "Calves", [], "Machine", "Sit with the pad over your knees and the balls of your feet on the platform. Raise your heels as high as possible. Lower slowly, controlling the stretch.",
  ),
  ex("e22", "Barbell Row", "Back", ["Biceps", "Lower back"], "Barbell", "Lean your torso to about 45 degrees with a neutral spine. Pull the bar toward your lower chest, retracting your shoulder blades. Lower without raising your torso.",
  ),
  ex("e23", "One-Arm Dumbbell Row", "Back", ["Biceps"], "Dumbbells", "Support one hand on the bench and keep your back flat. Pull the dumbbell to the side of your torso. Lower with a full lat stretch.",
  ),
  ex("e24", "Lat Pulldown", "Back", ["Biceps"], "Cable", "Grip the bar wide with your thighs locked under the pad. Pull until the bar reaches your upper chest. Return under control without shrugging.",
  ),
  ex("e25", "Seated Cable Row", "Back", ["Biceps"], "Cable", "Sit with your feet braced and torso slightly leaned forward. Pull the triangle to your lower abs, retracting your shoulder blades. Return with a full lat stretch.",
  ),
  ex("e26", "Chest-Supported Row", "Back", ["Biceps", "Traps"], "Machine", "Rest your chest on the support and grip the handles. Pull with your elbows going back. Lower slowly.",
  ),
  ex("e27", "Pull-up", "Back", ["Biceps", "Core"], "Bodyweight", "Grip the bar pronated at shoulder width. Pull until your chin clears the bar. Lower with control all the way down.",
  ),
  ex("e28", "Rope Pulldown", "Back", ["Shoulders"], "Cable", "Standing, hold the rope with arms extended overhead. Pull down keeping your arms straight. Return under control.",
  ),
  ex("e29", "Overhead Press", "Shoulders", ["Triceps", "Core"], "Barbell", "Standing, hold the bar at collar height with your core tight. Press overhead until your arms extend. Lower with control to chin height.",
  ),
  ex("e30", "Dumbbell Shoulder Press", "Shoulders", ["Triceps"], "Dumbbells", "Sit with your back supported and dumbbells at ear height. Press up without banging the dumbbells. Lower to 90 degrees under control.",
  ),
  ex("e31", "Lateral Raise", "Shoulders", [], "Dumbbells", "Stand with dumbbells at your sides and elbows slightly bent. Raise to shoulder height, leading with your elbows. Lower in two seconds.",
  ),
  ex("e32", "Front Raise", "Shoulders", [], "Dumbbells", "Hold the dumbbells in front of your thighs. Raise your arms to eye level. Lower under control without swinging.",
  ),
  ex("e33", "Reverse Pec Deck", "Shoulders", ["Back"], "Machine", "Sit facing the machine with your chest supported. Open your arms back, squeezing the rear shoulders. Return slowly.",
  ),
  ex("e34", "Dumbbell Shrug", "Traps", ["Shoulders"], "Dumbbells", "Hold dumbbells at your sides with arms extended. Shrug your shoulders toward your ears. Lower with a full trap stretch.",
  ),
  ex("e35", "Barbell Curl", "Biceps", ["Forearms"], "Barbell", "Standing, grip the bar supinated at shoulder width. Curl without moving your shoulders. Lower until your arms are fully extended.",
  ),
  ex("e36", "Alternating Dumbbell Curl", "Biceps", ["Forearms"], "Dumbbells", "Standing with dumbbells at your sides. Curl one arm, rotating the wrist outward. Lower under control and alternate.",
  ),
  ex("e37", "Hammer Curl", "Biceps", ["Forearms"], "Dumbbells", "Hold the dumbbells with a neutral grip. Curl keeping your wrists fixed. Lower slowly.",
  ),
  ex("e38", "Skull Crusher", "Triceps", [], "Barbell", "Lie on the bench with the bar above your forehead and elbows pointing at the ceiling. Lower the bar near your head by bending your elbows. Extend without flaring your elbows.",
  ),
  ex("e39", "Tricep Rope Pushdown", "Triceps", [], "Cable", "Stand with elbows pinned to your sides and hold the rope. Extend your elbows, spreading the rope at the bottom. Return to 90 degrees under control.",
  ),
  ex("e40", "Overhead Tricep Extension", "Triceps", [], "Dumbbells", "Sit and hold a dumbbell with both hands above your head. Lower behind your head by bending your elbows. Extend without flaring your elbows.",
  ),
  ex("e41", "Bench Dip", "Triceps", ["Chest"], "Bodyweight", "Place your hands on the edge of the bench with your legs extended in front. Lower your hips by bending your elbows. Press until your arms extend.",
  ),
  ex("e42", "Plank", "Core", ["Shoulders"], "Bodyweight", "Support your forearms and toes while keeping your body aligned. Brace your abs and glutes. Breathe while holding the position.",
  ),
  ex("e43", "Cable Crunch", "Core", [], "Cable", "Kneel facing away from the cable, holding the rope by your head. Crunch your torso, bringing your ribs toward your hips. Return slowly.",
  ),
];

export let profile: Profile = {
  id: "p1",
  nome: "Marcelo Alves",
  pesoKg: 82.5,
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
  pesoInicialKg: 79.5,
  pesoMetaKg: 88,
  metaIniciadaEm: new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10),
  metaPrazo: "2026-11-30",
};


export function setProfile(next: Profile) {
  profile = next;
}

const re = (
  id: string,
  exerciseId: string,
  ordem: number,
  seriesAlvo: number,
  repsMin: number,
  repsMax: number,
  descansoSeg: number,
  notas = "",
) => ({ id, exerciseId, ordem, seriesAlvo, repsMin, repsMax, descansoSeg, notas });

export const routines: Routine[] = [
  {
    id: "r1",
    nome: "Upper A",
    descricao: "Chest, back and shoulders — strength focus",
    exercicios: [
      re("r1e1", "e1", 0, 4, 5, 8, 150, "Add 2.5 kg when you can close 8 reps"),
      re("r1e2", "e24", 1, 4, 8, 12, 120),
      re("r1e3", "e2", 2, 3, 8, 12, 120),
      re("r1e4", "e25", 3, 3, 10, 12, 90),
      re("r1e5", "e31", 4, 3, 12, 15, 60),
      re("r1e6", "e39", 5, 3, 10, 15, 60),
      re("r1e7", "e35", 6, 3, 8, 12, 60),
    ],
  },
  {
    id: "r2",
    nome: "Lower B",
    descricao: "Full legs with hamstring emphasis",
    exercicios: [
      re("r2e1", "e7", 0, 4, 5, 8, 180, "Always break parallel on the way down"),
      re("r2e2", "e15", 1, 3, 8, 10, 150),
      re("r2e3", "e9", 2, 3, 10, 12, 120),
      re("r2e4", "e16", 3, 3, 10, 12, 90),
      re("r2e5", "e10", 4, 3, 12, 15, 60),
      re("r2e6", "e20", 5, 4, 12, 15, 45),
    ],
  },
];

export const workouts: Workout[] = [];
export const workoutSets: WorkoutSet[] = [];

// ---- Generated history: 6 sessions over the last 3 weeks ----
const baseCargas: Record<string, number> = {
  e1: 70, e24: 60, e2: 24, e25: 55, e31: 12, e39: 25, e35: 30,
  e7: 90, e15: 70, e9: 160, e16: 45, e10: 55, e20: 80,
};

const dias = [20, 18, 15, 12, 8, 4];
dias.forEach((diasAtras, i) => {
  const rotina = routines[i % 2]!;
  const semana = Math.floor(i / 2);
  const inicio = new Date(Date.now() - diasAtras * 86400000);
  inicio.setHours(19, 30, 0, 0);
  const duracaoSeg = 3300 + i * 120;
  const wid = `w${i + 1}`;
  let volume = 0;
  rotina.exercicios.forEach((rex, exIdx) => {
    const base = baseCargas[rex.exerciseId] ?? 20;
    const peso = Math.round((base + semana * (base > 50 ? 5 : 2)) * 2) / 2;
    // In recent sessions some exercises close the top of the rep range with low RPE
    // (triggers the load-progression suggestion).
    const fechouTopo = i >= 4 && exIdx % 2 === 0;
    for (let s = 1; s <= rex.seriesAlvo; s++) {
      const reps = fechouTopo ? rex.repsMax : rex.repsMax - ((s - 1) % 2);
      volume += peso * reps;
      workoutSets.push({
        id: `${wid}s${exIdx}-${s}`,
        workoutId: wid,
        exerciseId: rex.exerciseId,
        ordemExercicio: exIdx,
        serieNum: s,
        tipoSerie: s === 1 ? "aquecimento" : "normal",
        pesoKg: s === 1 ? Math.round(peso * 0.6 * 2) / 2 : peso,
        reps,
        rpe: fechouTopo ? 8 : s === rex.seriesAlvo ? 9 : 8,
        concluida: true,
      });
    }
  });
  workouts.push({
    id: wid,
    routineId: rotina.id,
    iniciadoEm: inicio.toISOString(),
    finalizadoEm: new Date(inicio.getTime() + duracaoSeg * 1000).toISOString(),
    duracaoSeg,
    volumeTotalKg: Math.round(volume),
    notas: i === 5 ? "Strong session, slept well." : "",
    origem: "rotina",
  });
});

export function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
