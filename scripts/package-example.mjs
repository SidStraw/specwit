import { cpSync } from 'node:fs'

// Keep the directly executable bundle next to the installable tarball.
cpSync(new URL('../packages/cli/dist/', import.meta.url), new URL('../example/dist/', import.meta.url), { recursive: true })
console.log('CLI 已輸出至 example/dist/：gov.mjs、安裝套件及第三方授權文件。')
