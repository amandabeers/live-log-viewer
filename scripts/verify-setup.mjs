#!/usr/bin/env node
// Setup diagnostic, run via `npm run verify`. Exits 0 when the scaffold is ready.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

let failed = false;
const ok = (m) => console.log(`\x1b[32m[ok]\x1b[0m   ${m}`);
const warn = (m) => console.log(`\x1b[33m[warn]\x1b[0m ${m}`);
const fail = (m) => {
  failed = true;
  console.log(`\x1b[31m[fail]\x1b[0m ${m}`);
};
const here = (p) => new URL(`../${p}`, import.meta.url);

// 1. Node version
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20 && major < 23) ok(`node ${process.version}`);
else fail(`need node 20-22, got ${process.version} (nvm reads .nvmrc; Volta reads package.json)`);

// 2. Dependencies installed
if (existsSync(here('node_modules/react/package.json')) && existsSync(here('node_modules/vite/package.json'))) {
  ok('deps resolved');
} else {
  fail('dependencies missing; run npm install');
}

// 3. Firehose intact
const firehoseFiles = ['source.ts', 'types.ts', 'generator.ts', 'Workbench.tsx', 'README.md'];
const missing = firehoseFiles.filter((f) => !existsSync(here(`src/firehose/${f}`)));
if (missing.length === 0) ok('firehose intact');
else fail(`firehose files missing (${missing.join(', ')}); restore src/firehose/ and do not modify it`);

// 4. TypeScript (non-fatal)
if (!failed) {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: new URL('..', import.meta.url) });
    ok('tsc clean');
  } catch {
    warn('tsc errors; run npx tsc --noEmit to see them');
  }
}

console.log(
  failed
    ? '\x1b[31m\x1b[1m\nSetup has issues; see above\x1b[0m'
    : '\x1b[32m\x1b[1m\nSetup OK. Run npm run dev and open http://localhost:5173\x1b[0m',
);
process.exit(failed ? 1 : 0);
