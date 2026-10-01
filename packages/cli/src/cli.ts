#!/usr/bin/env node
import type { Report } from './core'
import { argumentsFor } from './args'
import { check, complete, status, verify } from './core'
import { projectRoot } from './files'
import { GovError } from './model'

const help = `gov 0.1.0 — OpenSpec 流程輔助工具（Observe）

gov check <change> [--root <project>] [--json]
gov verify <change> [--root <project>] [--json]
gov verify <change> --run <uuid> --review <project-relative.json> [--root <project>] [--json]
gov status <change> [--run <uuid>] [--root <project>] [--json]
gov complete <change> [--dry-run] [--root <project>] [--json]

verify 會執行 .governance/runner.json 的命令（無 shell），不是 sandbox。
complete 僅提供清理預覽，無刪除模式。沒有 approve、--force 或隱含發布操作。
Exit codes: 0=此項觀察通過；1=檢查失敗；2=阻擋/未知/過期；3=使用方式/資料/IO 錯誤。
0 不代表受信任驗收或 Task 完成。`

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
  if (result.cleanupPreview) lines.push(`清理預覽（未執行）: ${result.cleanupPreview.deleteAfterExternalApproval.join(', ')}`)
  lines.push('此結果只供流程輔助，不是隔離、身分認證或發布許可。')
  return lines.join('\n')
}

let json = process.argv.includes('--json')
try {
  const options = argumentsFor(process.argv.slice(2))
  json = options.json
  if (options.help) console.log(help)
  else if (options.version) console.log('0.1.0')
  else {
    const root = projectRoot(options.root)
    const abort = new AbortController()
    const stop = (): void => abort.abort()
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    let result: Report
    try {
      switch (options.command) {
        case 'check': result = check(root, options.taskId); break
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
  const code = error instanceof GovError ? error.code : 'IO_ERROR'
  const message = error instanceof Error ? error.message : '未知錯誤'
  const result = { schemaVersion: 1, state: 'ERROR', assurance: 'Observe', eligible: false, issues: [{ code, message }], exitCode: 3 }
  if (json) console.log(JSON.stringify(result, null, 2))
  else console.error(`${code}: ${message}`)
  process.exitCode = 3
}
