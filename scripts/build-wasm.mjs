import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const entryFile = resolve(projectRoot, 'src/wasm/contrastDetector.ts');
const outputFile = resolve(projectRoot, 'src/app/wasm/contrastDetector.wasm');
const ascPath = require.resolve('assemblyscript/bin/asc.js');

mkdirSync(dirname(outputFile), { recursive: true });

execFileSync(
  process.execPath,
  [
    ascPath,
    entryFile,
    '--target',
    'release',
    '--runtime',
    'stub',
    '--optimize',
    '--noAssert',
    '--exportRuntime',
    '-o',
    outputFile,
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
);
