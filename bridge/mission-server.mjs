#!/usr/bin/env node
/**
 * Puente HTTP entre la oficina 3D (index.html) y el pipeline multiagente de OpenCode.
 *
 * Escucha solo en 127.0.0.1 y sirve también la propia oficina (index.html, css/ y js/),
 * así que basta con abrir http://127.0.0.1:8787/ (sin Live Server).
 *
 * Endpoints (todos salvo /health y los archivos estáticos exigen el token):
 *   GET  /health    -> comprobación de salud (sin token)
 *   GET  /state     -> estado de los 4 agentes, leyendo los artefactos del pipeline
 *   GET  /last      -> última misión/sesión
 *   POST /mission   -> recibe { mission } y lanza `opencode run /oficina <tarea>`
 *
 * Seguridad:
 *   - Token obligatorio en la cabecera X-Oficina-Token. Se toma de OFICINA_TOKEN o se
 *     genera al arrancar, y se guarda en state/bridge.token (permisos 600).
 *   - Se rechazan peticiones con cabecera Host o Origin que no sean locales
 *     (protege contra páginas web ajenas y contra DNS rebinding).
 *   - Cuerpo máximo de 16 KB, solo application/json, misión de hasta 2000 caracteres.
 *   - Una sola misión a la vez y tiempo máximo por misión (OFICINA_TIMEOUT_MIN, 30 por defecto).
 *
 * Variables de entorno opcionales:
 *   OFICINA_PORT, OFICINA_MODEL, OFICINA_TOKEN, OFICINA_TIMEOUT_MIN,
 *   OFICINA_ORIGINS (orígenes extra permitidos, separados por comas),
 *   OFICINA_STATE_DIR (carpeta del estado; por defecto ./state).
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
const STATE_DIR = process.env.OFICINA_STATE_DIR ? path.resolve(process.env.OFICINA_STATE_DIR) : path.join(ROOT, 'state');
const PIPELINE_DIR = path.join(ROOT, '.opencode', 'pipeline');
const HOST = '127.0.0.1';
const PORT = Number(process.env.OFICINA_PORT || 8787);
const MODEL = process.env.OFICINA_MODEL || ''; // opcional: --model provider/model
const TOKEN = process.env.OFICINA_TOKEN || crypto.randomBytes(24).toString('hex');
const TIMEOUT_MS = Math.max(0.01, Number(process.env.OFICINA_TIMEOUT_MIN || 30)) * 60_000;
const EXTRA_ORIGINS = (process.env.OFICINA_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

const MAX_BODY = 16 * 1024;
const MAX_MISSION = 2000;

const AGENTS = ['planificador', 'arquitecto', 'constructor', 'auditor'];
const ARTIFACT = {
  planificador: '01-plan.md',
  arquitecto: '02-arquitectura.md',
  constructor: '03-construccion.md',
  auditor: '04-auditoria.md'
};

fs.mkdirSync(STATE_DIR, { recursive: true });
const STATE_FILE = path.join(STATE_DIR, 'mission.json');
const TOKEN_FILE = path.join(STATE_DIR, 'bridge.token');
const PID_FILE = path.join(STATE_DIR, 'bridge.pid');
const LOG_FILE = path.join(STATE_DIR, 'opencode.log');

const IDLE_STATE = { sessionID: '', mission: '', startedAt: null, finishedAt: null, slug: '', status: 'idle' };

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { ...IDLE_STATE }; }
}
function writeState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

// Si el puente se cayó a mitad de una misión, no dejamos el estado "running" para siempre.
{
  const s = readState();
  if (s.status === 'running') {
    writeState({ ...s, status: 'error', error: 'El puente se reinició durante la misión', finishedAt: new Date().toISOString() });
  }
}

/** Misión en curso (en memoria): { child, timer, sessionID } o null. */
let current = null;

function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60) || 'mision';
}

/** Estado de cada agente, derivado de los artefactos en disco. */
function computeAgentStates(state) {
  const dir = path.join(PIPELINE_DIR, state.slug || '');
  const result = {};
  const firstMissing = AGENTS.find((a) => !fs.existsSync(path.join(dir, ARTIFACT[a])));
  AGENTS.forEach((id) => {
    const file = path.join(dir, ARTIFACT[id]);
    let status = 'idle';
    let screenText = 'En espera de instrucciones...';
    if (fs.existsSync(file)) {
      status = 'done';
      try {
        const txt = fs.readFileSync(file, 'utf8');
        const firstLine = txt.split('\n').find((l) => l.trim().startsWith('#')) || '';
        screenText = firstLine.replace(/^#+\s*/, '').trim().slice(0, 60) || 'Completado';
      } catch { screenText = 'Completado'; }
    } else if (state.status === 'running' && firstMissing === id) {
      status = 'working'; screenText = 'Trabajando...';
    } else if (state.status === 'error' && firstMissing === id) {
      status = 'error'; screenText = String(state.error || 'Error en el pipeline').slice(0, 60);
    }
    result[id] = { status, screenText };
  });
  return result;
}

/* ---------- Seguridad ---------- */

function hostAllowed(req) {
  const h = String(req.headers.host || '').toLowerCase();
  return h === `127.0.0.1:${PORT}` || h === `localhost:${PORT}`;
}

function originAllowed(origin) {
  if (!origin) return true;                 // misma origen o cliente que no es navegador
  if (origin === 'null') return true;       // index.html abierto desde archivo (el token sigue siendo obligatorio)
  if (EXTRA_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  } catch { return false; }
}

function tokenValid(req) {
  const given = String(req.headers['x-oficina-token'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !originAllowed(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, X-Oficina-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
}

function sendJSON(req, res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...corsHeaders(req)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      if (tooBig) return;
      size += c.length;
      if (size > MAX_BODY) { tooBig = true; chunks.length = 0; return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) { reject(Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 })); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('JSON inválido'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

/* ---------- Archivos estáticos (solo la oficina, lista cerrada) ---------- */

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function serveStatic(req, res, pathname) {
  let rel;
  try { rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)); }
  catch { rel = ''; }
  const permitido = rel === 'index.html' || /^(css|js)\/[A-Za-z0-9._-]+\.(css|js)$/.test(rel);
  if (!permitido || rel.includes('..')) { sendJSON(req, res, 404, { ok: false, error: 'Not found' }); return; }
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) { sendJSON(req, res, 404, { ok: false, error: 'Not found' }); return; }
    res.writeHead(200, {
      'Content-Type': STATIC_TYPES[path.extname(rel)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    res.end(data);
  });
}

/* ---------- Pipeline ---------- */

function launchPipeline(mission, sessionID) {
  const args = ['run'];
  if (MODEL) args.push('--model', MODEL);
  args.push('/oficina ' + mission);

  // Que opencode no herede el token del puente.
  const env = { ...process.env };
  delete env.OFICINA_TOKEN;

  // stdout/stderr van a un archivo: si nadie leyera una tubería, el proceso se bloquearía al llenarse.
  const logFd = fs.openSync(LOG_FILE, 'a');
  fs.writeSync(logFd, `\n=== ${new Date().toISOString()} · ${sessionID} · ${mission}\n`);

  const child = spawn('opencode', args, {
    cwd: ROOT, env, detached: true, windowsHide: true, stdio: ['ignore', logFd, logFd]
  });
  fs.closeSync(logFd);

  let finished = false;
  const finish = (status, exitCode, error) => {
    if (finished) return;
    finished = true;
    if (current && current.sessionID === sessionID) { clearTimeout(current.timer); current = null; }
    const s = readState();
    if (s.sessionID !== sessionID) return; // ya hay otra sesión en el estado
    s.status = status;
    s.finishedAt = new Date().toISOString();
    s.exitCode = exitCode;
    if (error) s.error = error; else delete s.error;
    writeState(s);
  };

  const timer = setTimeout(() => {
    killTree(child);
    const limite = TIMEOUT_MS >= 60_000 ? `${Math.round(TIMEOUT_MS / 60_000)} min` : `${Math.round(TIMEOUT_MS / 1000)} s`;
    finish('error', null, `Tiempo máximo excedido (${limite})`);
  }, TIMEOUT_MS);

  child.on('error', (err) => {
    finish('error', null, err.code === 'ENOENT'
      ? 'No se encontró el comando "opencode" en el PATH'
      : err.message);
  });
  child.on('exit', (code) => finish(code === 0 ? 'done' : 'error', code, code === 0 ? '' : `opencode terminó con código ${code}`));

  current = { child, timer, sessionID };
}

function killTree(child) {
  try { process.kill(-child.pid, 'SIGTERM'); }
  catch { try { child.kill(); } catch { /* ya terminó */ } }
}

/* ---------- Servidor ---------- */

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}`);

    if (!hostAllowed(req)) { sendJSON(req, res, 403, { ok: false, error: 'Host no permitido' }); return; }
    if (!originAllowed(req.headers.origin)) { sendJSON(req, res, 403, { ok: false, error: 'Origen no permitido' }); return; }

    if (req.method === 'OPTIONS') { sendJSON(req, res, 204, {}); return; }

    if (url.pathname === '/health') {
      sendJSON(req, res, 200, { ok: true, service: 'oficina-bridge', authRequired: true });
      return;
    }

    const isApi = ['/state', '/last', '/mission'].includes(url.pathname);
    if (!isApi) {
      if (req.method === 'GET' || req.method === 'HEAD') { serveStatic(req, res, url.pathname); return; }
      sendJSON(req, res, 404, { ok: false, error: 'Not found' });
      return;
    }

    if (!tokenValid(req)) { sendJSON(req, res, 401, { ok: false, error: 'Token inválido o ausente' }); return; }

    if (url.pathname === '/state' && req.method === 'GET') {
      const state = readState();
      sendJSON(req, res, 200, {
        sessionID: state.sessionID,
        mission: state.mission,
        status: state.status,
        slug: state.slug,
        error: state.error || '',
        agents: computeAgentStates(state),
        startedAt: state.startedAt,
        finishedAt: state.finishedAt
      });
      return;
    }

    if (url.pathname === '/last' && req.method === 'GET') {
      const state = readState();
      sendJSON(req, res, 200, { sessionID: state.sessionID, mission: state.mission });
      return;
    }

    if (url.pathname === '/mission' && req.method === 'POST') {
      if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) {
        sendJSON(req, res, 415, { ok: false, error: 'Content-Type debe ser application/json' });
        return;
      }
      let body;
      try { body = await readBody(req); }
      catch (e) { sendJSON(req, res, e.status || 400, { ok: false, error: e.message }); return; }

      // eslint-disable-next-line no-control-regex
      let mission = String(body.mission || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
      if (mission.startsWith('/oficina')) mission = mission.slice(8).trim();
      if (!mission) { sendJSON(req, res, 400, { ok: false, error: 'Falta mission' }); return; }
      if (mission.length > MAX_MISSION) {
        sendJSON(req, res, 400, { ok: false, error: `La misión supera los ${MAX_MISSION} caracteres` });
        return;
      }
      if (current) {
        sendJSON(req, res, 409, { ok: false, error: 'Ya hay una misión en curso', sessionID: current.sessionID });
        return;
      }

      const slug = slugify(mission);
      const sessionID = 'ses_' + crypto.randomBytes(4).toString('hex');
      writeState({ sessionID, mission, startedAt: new Date().toISOString(), finishedAt: null, slug, status: 'running' });
      launchPipeline(mission, sessionID);
      sendJSON(req, res, 200, { ok: true, sessionID, slug });
      return;
    }

    sendJSON(req, res, 404, { ok: false, error: 'Not found' });
  } catch (e) {
    console.error('[puente] error inesperado:', e);
    if (!res.headersSent) sendJSON(req, res, 500, { ok: false, error: 'Error interno' });
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. ¿Ya hay un puente corriendo? Ciérralo o usa OFICINA_PORT=<otro puerto>.`);
  } else {
    console.error('Error del servidor:', e.message);
  }
  process.exit(1);
});

function cleanup() {
  for (const f of [TOKEN_FILE, PID_FILE]) { try { fs.unlinkSync(f); } catch { /* no existe */ } }
}
function shutdown() {
  if (current) killTree(current.child);
  cleanup();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, HOST, () => {
  fs.writeFileSync(TOKEN_FILE, TOKEN, { mode: 0o600 });
  fs.writeFileSync(PID_FILE, String(process.pid));
  console.log(`Puente oficina escuchando en http://${HOST}:${PORT}`);
  console.log(`Proyecto: ${ROOT}`);
  console.log(`Abre la oficina aquí: http://${HOST}:${PORT}/#bridge=${TOKEN}`);
});
