import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const ajvRequire = createRequire(require.resolve('ajv'))
const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const notices = [readFileSync(new URL('../NOTICE', import.meta.url), 'utf8'), 'Third-party licenses for bundled dependencies.\n']
for (const [name, version] of Object.entries(metadata.inlinedDependencies)) {
  const resolver = ['minimist', 'zod', 'ajv', 'yaml'].includes(name) ? require : ajvRequire
  const directory = dirname(resolver.resolve(`${name}/package.json`))
  let license
  for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try { license = readFileSync(join(directory, file), 'utf8'); break }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  if (!license) throw new Error(`Missing license for ${name}`)
  notices.push(`${name}@${version}\n${license}`)
}
writeFileSync(new URL('../dist/THIRD_PARTY_NOTICES.txt', import.meta.url), notices.join('\n---\n\n'))
