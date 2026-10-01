// Persisted identifiers from 0.2.0. Keep these isolated from current branding.
export const legacySchemaName = 'gov'

export function checkEnvironment(taskId: string, runId: string, checkId: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    SPECWIT_TASK_ID: taskId, SPECWIT_RUN_ID: runId, SPECWIT_CHECK_ID: checkId,
    // Existing check scripts must continue to receive their original values.
    GOV_TASK_ID: taskId, GOV_RUN_ID: runId, GOV_CHECK_ID: checkId,
  }
}
