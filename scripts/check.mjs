#!/usr/bin/env node
// Comprueba la sintaxis de todo el JavaScript del proyecto (sin dependencias).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'bridge/mission-server.mjs',
  ...fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
  'scripts/sync-agents.mjs',
  ...fs.readdirSync(path.join(root, 'test')).filter((f) => f.endsWith('.mjs')).map((f) => `test/${f}`)
];

let fallos = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' });
  if (r.status !== 0) { fallos++; console.error(`✖ ${f}\n${r.stderr}`); }
}
console.log(fallos ? `${fallos} archivo(s) con errores de sintaxis.` : `✔ ${files.length} archivos con sintaxis correcta.`);
process.exit(fallos ? 1 : 0);
