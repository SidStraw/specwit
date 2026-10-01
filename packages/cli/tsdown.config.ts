import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { gov: 'src/cli.ts' },
  platform: 'node',
  target: 'node22',
  format: 'esm',
  dts: true,
  exports: { bin: { gov: './src/cli.ts' } },
  clean: true,
  sourcemap: true,
  shims: true,
  deps: { onlyBundle: ['minimist', 'zod', 'ajv', 'fast-deep-equal', 'json-schema-traverse', 'fast-uri'] },
})
