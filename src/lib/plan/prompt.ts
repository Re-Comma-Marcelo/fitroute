import { exercises } from "../data/mocks";
import { meals } from "../data/meals.mock";
import { CONSISTENCY_LABEL, TRAINING_YEARS_LABEL } from "./experience";
import { GOAL_PROMPT_LABEL } from "./frequency";
import { CONSULT_NOTE, filterMeals } from "./guardrails";
import { deriveTimeBudget, hoursLabel, maxPrepMinutes } from "./life";
import { describeSports, sportEmphasis } from "./sports";
import {
  DAY_KEYS,
  SLOT_PARTS,
  type GeneratedPlan,
  type GoalTranslation,
  type PlanIntake,
} from "./types";

/** Human-readable summary of what the user told us — shared by every prompt. */
export function intakeSummary(intake: PlanIntake): string {
  const budget = deriveTimeBudget(intake);
  const slots = DAY_KEYS.flatMap((day) =>
    SLOT_PARTS.filter((part) => intake.slots[day][part] !== "blocked").map(
      (part) => `${day} ${part} (${intake.slots[day][part]})`,
    ),
  );

  return [
    "## Person",
    `- ${intake.age} y, ${intake.sex}, ${intake.heightCm} cm, ${intake.weightKg} kg`,
    `- Daily activity outside sport: ${intake.dailyActivity}`,
    `- Training-style goal: ${intake.trainingGoal ? GOAL_PROMPT_LABEL[intake.trainingGoal] : "not stated"}`,
    `- Experience level (derived): ${intake.experience}`,
    `- Training history: ${TRAINING_YEARS_LABEL[intake.trainingYears]}, consistency last 6 months: ${CONSISTENCY_LABEL[intake.consistency]}`,
    "",
    "## Goal",
    intake.goalMode === "number"
      ? `- Target bodyweight: ${intake.targetWeightKg ?? "?"} kg in ${intake.timelineWeeks ?? "?"} weeks`
      : `- In their words: "${intake.goalText}" (timeline: ${intake.timelineWeeks ?? "?"} weeks)`,
    "",
    "## Gym context",
    `- Equipment: ${intake.equipment.join(", ") || "bodyweight only"}`,
    `- Gym days wanted: ${intake.gymDaysPerWeek}`,
    `- Injuries / limitations: ${intake.limitations || "none"}`,
    "",
    "## Other sports",
    intake.sports.length
      ? describeSports(intake.sports)
          .map((s) => `- ${s}`)
          .join("\n")
      : "- none",
    intake.sports.length
      ? `- Already trained hard by sport: ${sportEmphasis(intake.sports).join(", ")}`
      : "",
    "",
    "## Life & week",
    `- Usable parts of the day: ${slots.join(", ") || "none marked"}`,
    `- Work pattern: ${intake.workPattern}, commute ${intake.commuteMin} min, care duties: ${intake.careDuties ? "yes" : "no"}`,
    `- Sleep: ${intake.sleepHours} h, stress 1-5: ${intake.stress}`,
    `- Cooking time: ${intake.cookTime}, eats out ${intake.eatOutPerWeek}x/week, budget ${intake.budget}`,
    intake.lifeNotes ? `- Extra: ${intake.lifeNotes}` : "",
    "",
    "## Derived time budget (already computed — respect it)",
    `- Gym time available: ${hoursLabel(budget.gymMinutesPerWeek)} across ${budget.gymSlots.length} session(s)`,
    budget.gymSlots
      .map((s) => `  - ${s.day} ${s.part}: ${s.minutes} min, use kind '${s.suggestedKind}'`)
      .join("\n"),
    `- Sport time already committed: ${hoursLabel(budget.sportMinutesPerWeek)}`,
    `- Recovery factor: ${budget.recoveryFactor} (1 = fully recovered)`,
    budget.recommendedDays
      ? `- Research-based day range for this goal/experience: ${budget.recommendedDays.min}-${budget.recommendedDays.max} days/week. Requested: ${intake.gymDaysPerWeek}.`
      : "",
    budget.suggestConditioning
      ? "- The person does not train any other sport, so WHO/ACSM's separate aerobic-activity guideline (150+ min/week) is not otherwise met."
      : "",
    "",
    "## Food",
    `- Allergies / restrictions: ${intake.allergies || "none"}`,
    `- Dislikes: ${intake.dislikes || "none"}`,
    `- Likes: ${intake.likes || "not stated"}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function goalPrompt(intake: PlanIntake): string {
  return [
    "You translate a vague fitness goal into concrete numbers using mainstream, established exercise and nutrition science.",
    "Sustainable bodyweight change is 0.5-1% of bodyweight per week. Never encourage faster.",
    "Return JSON only, matching this shape:",
    '{"targetWeightLowKg":number,"targetWeightHighKg":number,"bodyCompNote":string,"timelineWeeks":number,"rationale":string,"unrealistic":boolean,"saferTimelineWeeks":number}',
    "rationale: one or two short sentences the user will read. bodyCompNote: a rough body-composition estimate in plain words.",
    "If the requested pace or goal is unsafe, set unrealistic=true and put a safer timeline in saferTimelineWeeks.",
    "",
    intakeSummary(intake),
  ].join("\n");
}

export function planPrompt(
  intake: PlanIntake,
  goal: GoalTranslation | null,
  feedback: string,
  previous: GeneratedPlan | null,
): string {
  const budget = deriveTimeBudget(intake);
  const allowedMeals = filterMeals(meals, intake, maxPrepMinutes(intake));
  const allowedExercises = exercises.filter(
    (e) =>
      intake.equipment.length === 0 ||
      intake.equipment.includes(e.equipamento) ||
      e.equipamento === "Bodyweight",
  );
  const exerciseList = (allowedExercises.length > 12 ? allowedExercises : exercises).map(
    (e) => `${e.id}|${e.nome}|${e.grupoPrimario}|${e.equipamento}`,
  );
  const mealList = allowedMeals.map(
    (m) => `${m.id}|${m.name}|${m.slots.join("/")}|${m.kcal}kcal|${m.proteinG}gP|${m.prepMin}min`,
  );

  const scope = intake.planScope;
  const wantsTraining = scope !== "diet";
  const wantsDiet = scope !== "training";

  const trainingRules = wantsTraining
    ? [
        `- Use at most ${Math.max(1, budget.gymSlots.length)} training day(s), on exactly the weekdays listed in the derived time budget, each using the kind noted there ('gym' or 'active').`,
        "- kind 'gym': a normal full session with 3+ exercises. kind 'active': the slot is too short for a full session — give it 1-4 bodyweight exercises (a short strength circuit) OR make it a plain cardio session (a brisk walk or light jog, exercises: []). Never leave an 'active' day with a full gym-length exercise list.",
        "- Each gym day's exercise count must fit its minutes (roughly one exercise per 10-12 minutes).",
        "- Mark days with a sport session as kind 'sport' (no exercises) and truly free days as 'rest'. Cover all 7 weekdays exactly once.",
        "- exerciseId MUST come from the exercise library.",
        "- Respect injuries/limitations and skip anything the person cannot do.",
        "- Every day needs a short 'why' referencing their life (time, sport, sleep, stress).",
        "- If the requested gym days exceed the research-based range, `summary` must briefly say so and explain, in one sentence, why the plan uses fewer (more days past that range gives no extra benefit — cite the frequency finding in plain words, no jargon).",
        "- If the person trains no other sport, `summary` should briefly note that adding some walking/jogging or other conditioning is worth it for general health, independent of their main training goal.",
      ]
    : [
        "- The person does NOT want a training plan from this app (they train on their own, or not at all).",
        "- Still return all 7 weekdays, each with kind 'rest', empty exercises, and a one-line why noting training isn't part of this plan.",
      ];

  const dietRules = wantsDiet
    ? [
        `- Diet: general framing only, no medical precision. Add this note verbatim as the last item of notes: "${CONSULT_NOTE}"`,
        "- Diet meals: one entry per meal slot (breakfast, lunch, snack, dinner), matched to their likes and cooking time.",
        "- mealId MUST come from the meal library.",
      ]
    : [
        "- The person does NOT want a diet plan from this app.",
        "- Still return the diet object, but with kcal, proteinG, carbsG and fatG set to 0, notes and meals as empty arrays, and sportDayNote as an empty string.",
      ];

  return [
    "You are a strength & conditioning coach and nutrition planner inside a training app.",
    "Ground every recommendation in mainstream, established science: progressive overload, standard rep ranges for the goal (strength 3-6, hypertrophy 6-12, endurance 12-20), adequate recovery. No fringe methodology.",
    wantsTraining
      ? "The person may train other sports too — plan the gym AROUND those sessions and their real weekly time, never on top of them."
      : "",
    "Hard rules:",
    ...trainingRules,
    ...dietRules,
    "Return JSON only:",
    '{"summary":string,"days":[{"day":"mon","kind":"gym|active|sport|rest","label":string,"minutes":number,"why":string,"exercises":[{"exerciseId":string,"sets":number,"repsMin":number,"repsMax":number,"restSec":number,"note":string}]}],"diet":{"kcal":number,"proteinG":number,"carbsG":number,"fatG":number,"notes":[string],"sportDayNote":string,"meals":[{"slot":"breakfast","mealId":string,"why":string}]}}',
    "",
    intakeSummary(intake),
    "",
    goal
      ? `## Confirmed numeric goal\n- Target ${goal.targetWeightLowKg}-${goal.targetWeightHighKg} kg over ${goal.timelineWeeks} weeks. ${goal.bodyCompNote}`
      : "",
    feedback ? `## User feedback on the previous plan (apply it)\n${feedback}` : "",
    previous ? `## Previous plan (JSON)\n${JSON.stringify(previous).slice(0, 4000)}` : "",
    "",
    wantsTraining ? "## Exercise library (id|name|group|equipment)" : "",
    wantsTraining ? exerciseList.join("\n") : "",
    "",
    wantsDiet ? "## Meal library (id|name|slots|kcal|protein|prep)" : "",
    wantsDiet ? mealList.join("\n") : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function importPrompt(raw: string): string {
  return [
    "Extract training history from pasted notes exported from another fitness app.",
    "Return JSON only:",
    '{"sessions":[{"date":"YYYY-MM-DD","label":string,"durationMin":number,"volumeKg":number}],"bodyweights":[{"date":"YYYY-MM-DD","kg":number}],"notes":[string]}',
    "Only include rows you can actually read. Never invent data. Use 0 when a number is missing.",
    "",
    "## Pasted text",
    raw.slice(0, 8000),
  ].join("\n");
}
