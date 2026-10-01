import minimist from 'minimist'
import { SpecWitError } from './model'
import { languageSchema } from './project'
import type { Language } from './project'

export interface Options {
  command: string
  taskId: string
  root: string
  json: boolean
  help: boolean
  version: boolean
  language?: Language
  runId?: string
  reviewRef?: string
}

export function argumentsFor(argv: string[]): Options {
  const parsed = minimist(argv, {
    string: ['root', 'run', 'review', 'language', '_'],
    boolean: ['json', 'help', 'version', 'dry-run'],
    alias: { h: 'help', v: 'version' },
    unknown: (argument: string) => {
      if (argument.startsWith('-')) throw new SpecWitError('UNKNOWN_OPTION', `Unknown option: ${argument}`)
      return true
    },
  })
  for (const key of ['root', 'run', 'review', 'language', 'json', 'help', 'version', 'dry-run']) {
    if (Array.isArray(parsed[key])) throw new SpecWitError('DUPLICATE_OPTION', `Duplicate option: --${key}.`)
  }
  for (const key of ['root', 'run', 'review', 'language']) {
    if (parsed[key] !== undefined && (typeof parsed[key] !== 'string' || !parsed[key].trim()))
      throw new SpecWitError('MISSING_OPTION_VALUE', `--${key} requires a value.`)
  }
  const [command, taskId] = parsed._
  if (parsed.language !== undefined && !languageSchema.safeParse(parsed.language).success)
    throw new SpecWitError('UNSUPPORTED_LANGUAGE', '--language must be en or zh-TW.')
  if (!parsed.help && !parsed.version) {
    if (command === 'init') {
      if (parsed._.length > 2 || (taskId && parsed.root)) throw new SpecWitError('USAGE', 'Usage: specwit init [project] [--language en|zh-TW] [--json]; choose a positional project or --root, not both.')
    }
    else if (!['validate', 'check', 'verify', 'status', 'complete'].includes(command) || !taskId || parsed._.length !== 2)
      throw new SpecWitError('USAGE', 'Usage: specwit init [project] or specwit <validate|verify|status|complete> <change> [--root <project>] [--json]')
    if (parsed.language && command !== 'init') throw new SpecWitError('INVALID_OPTION', '--language is only supported by init.')
    if (parsed.review && command !== 'verify') throw new SpecWitError('INVALID_OPTION', '--review is only supported by verify.')
    if (parsed.run && !['verify', 'status'].includes(command)) throw new SpecWitError('INVALID_OPTION', '--run is only supported by verify or status.')
    if (parsed['dry-run'] && command !== 'complete') throw new SpecWitError('INVALID_OPTION', '--dry-run is only supported by complete.')
    if (command === 'verify' && Boolean(parsed.review) !== Boolean(parsed.run)) throw new SpecWitError('INVALID_OPTION', 'Review import requires both --review and --run.')
  }
  return { command, taskId: command === 'init' ? '' : taskId, root: parsed.root ?? (command === 'init' ? taskId : undefined) ?? process.cwd(), json: parsed.json, help: parsed.help, version: parsed.version, language: parsed.language, runId: parsed.run, reviewRef: parsed.review }
}
