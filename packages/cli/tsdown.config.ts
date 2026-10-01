import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { specwit: 'src/cli.ts' },
  platform: 'node',
  target: 'node22',
  format: 'esm',
  dts: true,
  exports: { bin: { specwit: './src/cli.ts' } },
  clean: true,
  sourcemap: true,
  shims: true,
  deps: { onlyBundle: ['minimist', 'zod', 'ajv', 'yaml', 'fast-deep-equal', 'json-schema-traverse', 'fast-uri'] },
})
