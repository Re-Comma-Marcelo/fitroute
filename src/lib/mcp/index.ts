import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getTrainingContext from "./tools/get-training-context";
import createRoutine from "./tools/create-routine";
import createWeekDiet from "./tools/create-week-diet";
import logCoachNote from "./tools/log-coach-note";
import { OAUTH_ISSUER } from "./issuer";

export default defineMcp({
  name: "iron-logger",
  title: "Iron Logger",
  version: "0.2.0",
  auth: auth.oauth.issuer({
    issuer: OAUTH_ISSUER,
    acceptedAudiences: ["authenticated"],
  }),
  instructions:
    "Tools for Iron Logger, a strength-training and nutrition app. Call get_training_context first: it returns the exercise and meal libraries and, when the user is connected, their profile, recent workouts and coach notes. create_routine, create_week_diet and log_coach_note then write directly into the connected user's app (and also return a Forja import code as a fallback). Without a connected account the write tools refuse and the read tool returns the shared libraries only.",
  tools: [getTrainingContext, createRoutine, createWeekDiet, logCoachNote] as unknown as Parameters<
    typeof defineMcp
  >[0]["tools"],
});
