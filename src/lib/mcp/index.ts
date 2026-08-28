import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getTrainingContext from "./tools/get-training-context";
import createRoutine from "./tools/create-routine";
import createWeekDiet from "./tools/create-week-diet";
import logCoachNote from "./tools/log-coach-note";

/**
 * OAuth protection is opt-in through the build-time env var:
 *  - VITE_FORJA_SUPABASE_URL set   → the server is protected and Supabase Auth
 *    is the OAuth 2.1 issuer, so tools act as the signed-in app user.
 *  - not set                       → the server stays public (today's
 *    behaviour): reads return the shared libraries only, writes refuse.
 */
const supabaseUrl = (import.meta.env["VITE_FORJA_SUPABASE_URL"] as string | undefined)?.replace(
  /\/+$/,
  "",
);

const authConfig = supabaseUrl
  ? auth.oauth.issuer({
      issuer: `${supabaseUrl}/auth/v1`,
      acceptedAudiences: ["authenticated"],
    })
  : undefined;

export default defineMcp({
  name: "iron-logger",
  title: "Iron Logger",
  version: "0.2.0",
  ...(authConfig ? { auth: authConfig } : {}),
  instructions:
    "Tools for Iron Logger, a strength-training and nutrition app. Call get_training_context first: it returns the exercise and meal libraries and, when the user is connected, their profile, recent workouts and coach notes. create_routine, create_week_diet and log_coach_note then write directly into the connected user's app (and also return a Forja import code as a fallback). Without a connected account the write tools refuse and the read tool returns the shared libraries only.",
  tools: [getTrainingContext, createRoutine, createWeekDiet, logCoachNote] as unknown as Parameters<
    typeof defineMcp
  >[0]["tools"],
});
