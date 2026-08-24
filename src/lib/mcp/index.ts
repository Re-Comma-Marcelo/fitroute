import { defineMcp } from "@lovable.dev/mcp-js";
import getTrainingContext from "./tools/get-training-context";
import createRoutine from "./tools/create-routine";
import createWeekDiet from "./tools/create-week-diet";
import logCoachNote from "./tools/log-coach-note";

export default defineMcp({
  name: "iron-logger",
  title: "Iron Logger",
  version: "0.1.0",
  instructions:
    "Tools for Forja, a strength-training and nutrition app. Call get_training_context first to load the exercise and meal libraries, then use create_routine, create_week_diet, or log_coach_note. Each returns a Forja import code the user pastes into Profile → Claude → Import; nothing is written to their app directly.",
  tools: [getTrainingContext, createRoutine, createWeekDiet, logCoachNote] as unknown as Parameters<
    typeof defineMcp
  >[0]["tools"],
});
