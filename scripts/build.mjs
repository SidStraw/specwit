import { cp, mkdir, rm } from 'node:fs/promises';
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../website/', import.meta.url), output, { recursive: true });
await cp(new URL('../docs/', import.meta.url), new URL('docs/', output), { recursive: true });
console.log('Built static website in dist/');
