#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import type { Report } from './core'
import { argumentsFor } from './args'
import { check, complete, status, verify } from './core'
import { projectRoot } from './files'
import { SpecWitError } from './model'
import { initialize } from './init'
import { readOpenSpecConfig, readProject, requireProject } from './project'
import type { Language } from './project'
import { VERSION } from './version'

const help = `SpecWit ${VERSION} — OpenSpec workflow setup and verification (Observe)

SpecWit, short for SpecWitness, connects specifications with observed behavior
and verification evidence, while making remaining unknowns explicit.

specwit init [project] [--language en|zh-TW] [--json]
specwit validate <change> [--root <project>] [--json]
specwit verify <change> [--root <project>] [--json]
specwit verify <change> --run <uuid> --review <project-relative.json> [--root <project>] [--json]
specwit status <change> [--run <uuid>] [--root <project>] [--json]
specwit complete <change> [--dry-run] [--root <project>] [--json]

init requires a completed local openspec init (OpenSpec >=1.14.0 <2).
English is the default. Interactive init offers Traditional Chinese (zh-TW).
Use --language or --json for non-interactive setup. init also accepts --root.
check is a compatibility alias for validate. Existing projects must run specwit init.
validate is read-only; verify runs configured argv commands without a sandbox.
complete only previews cleanup; it never deletes or finalizes a Task.
Exit codes: 0=setup/Observe check passed; 1=FAIL; 2=blocked/unknown/stale;
3=usage/data/IO error. Exit 0 is not trusted acceptance or publishing permission.`

async function chooseLanguage(current: Language = 'en'): Promise<Language> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await terminal.question(`Workflow language / 流程語言: 1) English  2) 繁體中文 [${current === 'en' ? '1' : '2'}]: `)).trim()
    if (!answer) return current
    if (['1', 'en'].includes(answer)) return 'en'
    if (['2', 'zh-TW'].includes(answer)) return 'zh-TW'
    throw new SpecWitError('UNSUPPORTED_LANGUAGE', 'Choose 1 (English) or 2 (繁體中文), or use --language en|zh-TW.')
  }
  finally { terminal.close() }
}

function render(result: Report): string {
  const lines = [`${result.command} ${result.taskId}: ${result.state}`, 'Assurance: Observe · eligible=false']
  if (result.planDigest) lines.push(`Plan: ${result.planDigest}`)
  if (result.candidateDigest) lines.push(`Candidate inputs: ${result.candidateDigest}`)
  if (result.run) {
    lines.push(`Run: ${result.run.runId}`)
    for (const check of result.run.checks) lines.push(`  ${check.checkId}: ${check.verdict}${check.reason ? ` (${check.reason})` : ''}`)
  }
  for (const issue of result.issues) lines.push(`- ${issue.code}: ${issue.message}`)
  for (const issue of result.humanPending ?? []) {
    if (!result.issues.some(item => item.message === issue.message)) lines.push(`- ${issue.code}: ${issue.message}`)
  }
  if (result.cleanupPreview) lines.push(`Cleanup preview (not executed): ${result.cleanupPreview.deleteAfterExternalApproval.join(', ')}`)
  lines.push('Observe only: no isolation, identity verification, or publishing permission.')
  return lines.join('\n')
}

let json = process.argv.includes('--json')
try {
  const options = argumentsFor(process.argv.slice(2))
  json = options.json
  if (options.help) console.log(help)
  else if (options.version) console.log(VERSION)
  else if (options.command === 'init') {
    const root = projectRoot(options.root)
    readOpenSpecConfig(root)
    const language = options.language ?? (process.stdin.isTTY && process.stdout.isTTY && !json
      ? await chooseLanguage(readProject(root)?.language)
      : undefined)
    const result = initialize(root, language)
    console.log(json ? JSON.stringify(result, null, 2) : [
      `specwit init: ${result.state} (${result.language})`,
      `Project: ${result.root}`, `Schema: ${result.schema}`,
      ...result.filesWritten.map(ref => `  ${ref}`), ...result.notes,
    ].join('\n'))
  }
  else {
    const root = projectRoot(options.root)
    requireProject(root)
    const abort = new AbortController()
    const stop = (): void => abort.abort()
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    let result: Report
    try {
      switch (options.command) {
        case 'check': result = check(root, options.taskId); break
        case 'validate': result = { ...check(root, options.taskId), command: 'validate' }; break
        case 'status': result = status(root, options.taskId, options.runId); break
        case 'complete': result = complete(root, options.taskId); break
        default: result = await verify(root, options.taskId, { runId: options.runId, reviewRef: options.reviewRef, signal: abort.signal })
      }
    }
    finally {
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
    }
    console.log(json ? JSON.stringify(result, null, 2) : render(result))
    process.exitCode = result.exitCode
  }
}
catch (error) {
  const code = error instanceof SpecWitError ? error.code : 'IO_ERROR'
  const message = error instanceof Error ? error.message : 'Unknown error'
  const result = { schemaVersion: 1, state: 'ERROR', assurance: 'Observe', eligible: false, issues: [{ code, message }], exitCode: 3 }
  if (json) console.log(JSON.stringify(result, null, 2))
  else console.error(`${code}: ${message}`)
  process.exitCode = 3
}
