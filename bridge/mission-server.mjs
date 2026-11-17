#!/usr/bin/env node
/**
 * Puente HTTP entre la oficina 3D (index.html) y el pipeline multiagente de OpenCode.
 *
 * Endpoints:
 *   POST /mission   -> recibe { mission } y lanza `opencode run /oficina <tarea>`
 *   GET  /state     -> devuelve el estado de los 4 agentes leyendo los artefactos
 *   GET  /last      -> devuelve la última misión/sesión
 *   POST /approve   -> (placeholder) puertas de aprobación
 *   GET  /health    -> comprobación de salud
 *
 * Sin dependencias externas: solo Node.js >= 18.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(ROOT, 'state');
const PIPELINE_DIR = path.join(ROOT, '.opencode', 'pipeline');
const PORT = Number(process.env.OFICINA_PORT || 8787);
const MODEL = process.env.OFICINA_MODEL || ''; // opcional: --model provider/model

const AGENTS = ['planificador', 'arquitecto', 'constructor', 'auditor'];
const ARTIFACT = {
  planificador: '01-plan.md',
  arquitecto: '02-arquitectura.md',
  constructor: '03-construccion.md',
  auditor: '04-auditoria.md'
};

fs.mkdirSync(STATE_DIR, { recursive: true });
const STATE_FILE = path.join(STATE_DIR, 'mission.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { sessionID: '', mission: '', startedAt: null, finishedAt: null, slug: '', status: 'idle' }; }
}
function writeState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60) || 'mision';
}

/**状态 derivado de los artefactos en disco */
function computeAgentStates(state) {
  const slug = state.slug;
  const dir = path.join(PIPELINE_DIR, slug);
  const result = {};
  AGENTS.forEach((id, idx) => {
    const file = path.join(dir, ARTIFACT[id]);
    const exists = fs.existsSync(file);
    let status = 'idle';
    let screenText = 'En espera de instrucciones...';
    if (exists) {
      status = 'done';
      try {
        const txt = fs.readFileSync(file, 'utf8');
        const firstLine = txt.split('\n').find((l) => l.trim().startsWith('#')) || '';
        screenText = firstLine.replace(/^#+\s*/, '').trim().slice(0, 60) || 'Completado';
      } catch { screenText = 'Completado'; }
    } else if (state.status === 'running') {
      // El agente activo es el primero sin artefacto
      const firstMissing = AGENTS.find((a) => !fs.existsSync(path.join(dir, ARTIFACT[a])));
      if (firstMissing === id) { status = 'working'; screenText = 'Trabajando...'; }
    }
    result[id] = { status, screenText };
  });
  return result;
}

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });
}

function launchPipeline(mission, slug) {
  const args = ['run'];
  if (MODEL) args.push('--model', MODEL);
  args.push('/oficina ' + mission);

  const child = spawn('opencode', args, {
    cwd: ROOT,
    env: process.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', (d) => process.stderr.write('[opencode] ' + d));
  child.on('exit', (code) => {
    const s = readState();
    s.status = code === 0 ? 'done' : 'error';
    s.finishedAt = new Date().toISOString();
    s.exitCode = code;
    writeState(s);
  });
  child.unref();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') { sendJSON(res, 204, {}); return; }

  if (url.pathname === '/health') { sendJSON(res, 200, { ok: true, service: 'oficina-bridge' }); return; }

  if (url.pathname === '/state' && req.method === 'GET') {
    const state = readState();
    sendJSON(res, 200, {
      sessionID: state.sessionID,
      mission: state.mission,
      status: state.status,
      slug: state.slug,
      agents: computeAgentStates(state),
      startedAt: state.startedAt,
      finishedAt: state.finishedAt
    });
    return;
  }

  if (url.pathname === '/last' && req.method === 'GET') {
    const state = readState();
    sendJSON(res, 200, { sessionID: state.sessionID, mission: state.mission });
    return;
  }

  if (url.pathname === '/mission' && req.method === 'POST') {
    const body = await readBody(req);
    let mission = String(body.mission || '').trim();
    if (!mission) { sendJSON(res, 400, { ok: false, error: 'Falta mission' }); return; }
    if (mission.startsWith('/oficina')) mission = mission.slice(8).trim();

    const slug = slugify(mission);
    const sessionID = 'ses_' + crypto.randomBytes(4).toString('hex');
    writeState({ sessionID, mission, startedAt: new Date().toISOString(), finishedAt: null, slug, status: 'running' });

    launchPipeline(mission, slug);
    sendJSON(res, 200, { ok: true, sessionID, slug });
    return;
  }

  if (url.pathname === '/approve' && req.method === 'POST') {
    // El pipeline actual no se detiene en puertas; se acepta y se registra.
    const body = await readBody(req);
    sendJSON(res, 200, { ok: true, decision: body.decision || 'approve' });
    return;
  }

  sendJSON(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Puente oficina escuchando en http://127.0.0.1:${PORT}`);
  console.log(`Proyecto: ${ROOT}`);
});
