import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { put } from './helpers'

export function openSpecProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'specwit init project '))
  for (const ref of ['openspec/specs', 'openspec/changes']) mkdirSync(join(root, ref), { recursive: true })
  put(root, 'openspec/config.yaml', '# Keep the project comment\nschema: team-flow\ncontext: |\n  Preserve the existing product policy.\nrules:\n  tasks:\n    - Keep task-specific checks.\noperations:\n  apply:\n    guidance:\n      - Run the existing project linter.\nreferences: []\n')
  return root
}

// Fake only OpenSpec discovery, never approval or product evidence. A separate
// real-OpenSpec smoke test verifies the generated schema and instruction paths.
export function discoveryStub(root: string, version = '1.14.0', resolvedRoot?: string): string {
  const ref = 'test-openspec.mjs'
  put(root, ref, `
if (process.argv[2] === '--version') console.log(${JSON.stringify(version)});
else if (process.argv.slice(2).join(' ') === 'list --json') console.log(JSON.stringify({changes:[],root:{path:${resolvedRoot ? JSON.stringify(resolvedRoot) : 'process.cwd()'},source:'nearest'}}));
else process.exitCode = 99;
`)
  return join(root, ref)
}
