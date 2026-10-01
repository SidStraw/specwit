import minimist from 'minimist'
import { GovError } from './model'

export interface Options {
  command: string
  taskId: string
  root: string
  json: boolean
  help: boolean
  version: boolean
  runId?: string
  reviewRef?: string
}

export function argumentsFor(argv: string[]): Options {
  const parsed = minimist(argv, {
    string: ['root', 'run', 'review', '_'],
    boolean: ['json', 'help', 'version', 'dry-run'],
    alias: { h: 'help', v: 'version' },
    unknown: (argument: string) => {
      if (argument.startsWith('-')) throw new GovError('UNKNOWN_OPTION', `未知參數：${argument}`)
      return true
    },
  })
  for (const key of ['root', 'run', 'review', 'json', 'help', 'version', 'dry-run']) {
    if (Array.isArray(parsed[key])) throw new GovError('DUPLICATE_OPTION', `不可重複指定 --${key}。`)
  }
  for (const key of ['root', 'run', 'review']) {
    if (parsed[key] !== undefined && (typeof parsed[key] !== 'string' || !parsed[key].trim()))
      throw new GovError('MISSING_OPTION_VALUE', `--${key} 需要值。`)
  }
  const [command, taskId] = parsed._
  if (!parsed.help && !parsed.version) {
    if (!['check', 'verify', 'status', 'complete'].includes(command) || !taskId || parsed._.length !== 2)
      throw new GovError('USAGE', '用法：gov <check|verify|status|complete> <change> [--root <project>] [--json]')
    if (parsed.review && command !== 'verify') throw new GovError('INVALID_OPTION', '--review 只能用於 verify。')
    if (parsed.run && !['verify', 'status'].includes(command)) throw new GovError('INVALID_OPTION', '--run 只能用於 verify 或 status。')
    if (parsed['dry-run'] && command !== 'complete') throw new GovError('INVALID_OPTION', '--dry-run 只能用於 complete。')
    if (command === 'verify' && Boolean(parsed.review) !== Boolean(parsed.run)) throw new GovError('INVALID_OPTION', '匯入 review 必須同時指定 --review 與 --run。')
  }
  return { command, taskId, root: parsed.root ?? process.cwd(), json: parsed.json, help: parsed.help, version: parsed.version, runId: parsed.run, reviewRef: parsed.review }
}
