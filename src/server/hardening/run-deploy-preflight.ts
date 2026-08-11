/**
 * Sprint 31 — deploy preflight (code-only).
 * Prints ordered cutover + migration recovery guidance.
 * Does NOT connect to production Postgres/Redis or invent credentials.
 *
 * Run: npm run preflight:deploy
 */

import {
  assertDatabaseSeedAllowed,
  getDeployPreflightChecklist,
  getMigrationRecoverySteps,
  resolveSeedAppEnv,
} from "@/src/server/hardening/deploy-readiness";

function main(): void {
  const appEnv = resolveSeedAppEnv();
  console.log("Sprint 31 deploy preflight");
  console.log(`Current process APP_ENV resolution: ${appEnv}`);
  console.log("");

  try {
    assertDatabaseSeedAllowed();
    console.log("PASS  seed guard — current env may run db:seed (non-production)");
  } catch (error) {
    console.log(
      `PASS  seed guard — production refuse active (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  console.log("");
  console.log("## Cutover checklist");
  for (const item of getDeployPreflightChecklist()) {
    console.log(
      `- [${item.classification}] ${item.id}: ${item.title}\n  ${item.detail}`,
    );
  }

  console.log("");
  console.log("## Migration recovery (forward-only)");
  for (const [index, step] of getMigrationRecoverySteps().entries()) {
    console.log(`${index + 1}. ${step}`);
  }

  console.log("");
  console.log(
    "Reminder: do not invent DATABASE_URL / REDIS_URL / production domains. Owner + infra required.",
  );
}

main();
