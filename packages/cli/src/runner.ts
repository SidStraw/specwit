import { spawn } from 'node:child_process'
import type { CheckResult } from './model'
import { checkOutputSchema } from './model'

export function executeCheck(root: string, taskId: string, runId: string, check: { id: string, command: string[] }, timeoutSeconds: number, signal?: AbortSignal): Promise<CheckResult> {
  return new Promise((resolve) => {
    const started = Date.now()
    let stdout = ''
    let size = 0
    let failure: string | null = null
    let settled = false
    const command = check.command[0] === '$NODE' ? process.execPath : check.command[0]
    const child = spawn(command, check.command.slice(1), {
      cwd: root,
      shell: false,
      detached: process.platform !== 'win32',
      env: { ...process.env, GOV_TASK_ID: taskId, GOV_RUN_ID: runId, GOV_CHECK_ID: check.id },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    function kill(): void {
      try {
        if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL')
        else child.kill('SIGKILL')
      }
      catch { /* The process may have exited already. */ }
    }
    function abort(): void { failure = 'CANCELLED'; kill() }
    const timer = setTimeout(() => { failure = 'TIMEOUT'; kill() }, timeoutSeconds * 1000)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    function finish(exitCode: number | null): void {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      kill()
      let result: CheckResult = { checkId: check.id, verdict: 'INCONCLUSIVE', observations: [], reason: failure, exitCode, durationMs: Date.now() - started }
      if (!failure) {
        try {
          const parsed = checkOutputSchema.safeParse(JSON.parse(stdout))
          if (!parsed.success || parsed.data.checkId !== check.id) result.reason = 'INVALID_REPORT'
          else if (exitCode !== 0 && parsed.data.verdict !== 'FAIL') result.reason = 'EXIT_REPORT_CONFLICT'
          else result = { ...result, verdict: parsed.data.verdict, observations: parsed.data.observations }
        }
        catch { result.reason = 'INVALID_REPORT' }
      }
      resolve(result)
    }
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      size += Buffer.byteLength(chunk)
      if (size > 256 * 1024) { failure = 'OUTPUT_LIMIT'; kill() }
      else stdout += chunk
    })
    child.stderr.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 256 * 1024) { failure = 'OUTPUT_LIMIT'; kill() }
    })
    child.once('error', () => { failure = 'SPAWN_ERROR'; finish(null) })
    child.once('close', code => finish(code))
  })
}
