import { getAgencyOrNull } from "@repo/config/server";
import { isDemoAgencySlug } from "./constants";

/** True while handling a request (or job) for the public demo agency. */
export function inDemoAgency(): boolean {
  return isDemoAgencySlug(getAgencyOrNull()?.slug);
}

/** AI calls cost money per request, so the public demo only gets them when opted in. */
export function demoAiEnabled(): boolean {
  return process.env.DEMO_AI_ENABLED === "true";
}
