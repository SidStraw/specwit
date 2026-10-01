import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = fileURLToPath(new URL('../example/dist/', import.meta.url))
const packageRoot = fileURLToPath(new URL('../packages/cli/', import.meta.url))
mkdirSync(output, { recursive: true })
const build = spawnSync('npm', ['run', 'build'], { cwd: packageRoot, stdio: 'inherit' })
if (build.status !== 0) throw new Error(build.error?.message || 'CLI build failed')
// Prepack build output is not JSON; build explicitly, then parse only pack's JSON.
const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', output], {
  cwd: packageRoot, encoding: 'utf8',
})
if (packed.status !== 0) throw new Error([packed.stderr, packed.stdout, packed.error?.message].filter(Boolean).join('\n') || 'npm pack failed')
const [metadata] = JSON.parse(packed.stdout)

// Remove only known obsolete build artifacts, never historical demo data.
for (const filename of readdirSync(output)) {
  if (/^gov(?:\.mjs(?:\.map)?|\.d\.mts|-cli-\d+\.\d+\.\d+\.tgz)$/.test(filename)) unlinkSync(join(output, filename))
}

// Keep the directly executable bundle next to the installable tarball.
cpSync(new URL('../packages/cli/dist/', import.meta.url), new URL('../example/dist/', import.meta.url), { recursive: true })
console.log(`Packed ${metadata.filename}; executable and notices copied to example/dist/.`)
