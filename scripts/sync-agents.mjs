#!/usr/bin/env node
// Sincroniza los agentes y los modelos desde opencode-pipeline (la fuente única).
//
//   node scripts/sync-agents.mjs                     # descarga desde GitHub (rama main)
//   node scripts/sync-agents.mjs --from ../opencode-pipeline   # copia desde un clon local
//   node scripts/sync-agents.mjs --check             # solo comprueba si están al día (código 1 si no)
//
// Solo toca los archivos compartidos; el comando /oficina es propio de este repo y no se modifica.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = 'https://raw.githubusercontent.com/jhonni-png/opencode-pipeline/main/';
const FILES = [
  '.opencode/opencode.jsonc',
  '.opencode/agents/director.md',
  '.opencode/agents/planificador.md',
  '.opencode/agents/arquitecto.md',
  '.opencode/agents/constructor.md',
  '.opencode/agents/auditor.md'
];

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const fromIdx = args.indexOf('--from');
const fromDir = fromIdx >= 0 ? path.resolve(args[fromIdx + 1] || '') : null;

async function fuente(rel) {
  if (fromDir) return fs.readFileSync(path.join(fromDir, rel), 'utf8');
  const res = await fetch(RAW + rel);
  if (!res.ok) throw new Error(`No se pudo descargar ${rel} (HTTP ${res.status})`);
  return res.text();
}

let distintos = 0;
for (const rel of FILES) {
  const destino = path.join(ROOT, rel);
  let nuevo;
  try { nuevo = (await fuente(rel)).replace(/\r\n/g, '\n'); }
  catch (e) { console.error('✖ ' + e.message); process.exit(2); }
  const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8').replace(/\r\n/g, '\n') : null;
  if (actual === nuevo) { console.log('= ' + rel); continue; }
  distintos++;
  if (checkOnly) { console.log('≠ ' + rel + ' (difiere de opencode-pipeline)'); continue; }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, nuevo);
  console.log('↻ ' + rel + ' (actualizado)');
}

if (checkOnly) {
  console.log(distintos ? `${distintos} archivo(s) distintos. Ejecuta: npm run sync-agents` : '✔ Agentes al día con opencode-pipeline.');
  process.exit(distintos ? 1 : 0);
}
console.log(distintos ? `✔ ${distintos} archivo(s) actualizados.` : '✔ Ya estaba todo al día.');
