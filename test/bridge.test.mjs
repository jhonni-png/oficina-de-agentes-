// Pruebas del puente (bridge/mission-server.mjs). Usan un "opencode" falso: no gastan cuota de API.
// Ejecutar con: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.join(ROOT, 'bridge', 'mission-server.mjs');
const skip = process.platform === 'win32' ? 'el opencode falso es un script bash' : false;

let port, token, proc, tmp, stateDir;

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

function request(method, urlPath, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* no es JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, text: data, json });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const auth = () => ({ 'X-Oficina-Token': token });
const post = (mission, extra = {}) => request('POST', '/mission', {
  headers: { 'Content-Type': 'application/json', ...auth(), ...extra },
  body: JSON.stringify({ mission })
});
const state = async () => (await request('GET', '/state', { headers: auth() })).json;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitStatus(expected, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const s = await state();
    if (s.status === expected) return s;
    if (Date.now() - t0 > ms) assert.fail(`se esperaba "${expected}" y quedó en "${s.status}"`);
    await sleep(100);
  }
}

before(async () => {
  if (skip) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oficina-test-'));
  stateDir = path.join(tmp, 'state');
  const bin = path.join(tmp, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'opencode'), '#!/usr/bin/env bash\nsleep 1\ncase "$*" in *falla*) exit 3;; esac\nexit 0\n', { mode: 0o755 });
  port = await freePort();
  token = 'test-token-' + Math.random().toString(16).slice(2);
  proc = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, OFICINA_PORT: String(port), OFICINA_TOKEN: token, OFICINA_STATE_DIR: stateDir },
    stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await request('GET', '/health')).status === 200) return; } catch { /* aún no escucha */ }
    await sleep(100);
  }
  assert.fail('el puente no arrancó');
});

after(() => {
  if (proc) proc.kill('SIGTERM');
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

test('health responde sin token', { skip }, async () => {
  const r = await request('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.authRequired, true);
});

test('la API exige token', { skip }, async () => {
  assert.equal((await request('GET', '/state')).status, 401);
  assert.equal((await request('GET', '/state', { headers: { 'X-Oficina-Token': 'nope' } })).status, 401);
  assert.equal((await request('POST', '/mission', { headers: { 'Content-Type': 'application/json' }, body: '{"mission":"x"}' })).status, 401);
  assert.equal((await request('GET', '/state', { headers: auth() })).status, 200);
});

test('rechaza orígenes y hosts ajenos (otra página web / DNS rebinding)', { skip }, async () => {
  assert.equal((await request('GET', '/state', { headers: { ...auth(), Origin: 'https://evil.com' } })).status, 403);
  assert.equal((await request('GET', '/state', { headers: { ...auth(), Host: 'evil.com:' + port } })).status, 403);
  assert.equal((await request('OPTIONS', '/mission', { headers: { Origin: 'https://evil.com' } })).status, 403);
  const ok = await request('OPTIONS', '/mission', { headers: { Origin: 'http://localhost:5500' } });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5500');
});

test('valida el cuerpo de /mission', { skip }, async () => {
  const j = { 'Content-Type': 'application/json', ...auth() };
  assert.equal((await request('POST', '/mission', { headers: { 'Content-Type': 'text/plain', ...auth() }, body: '{"mission":"x"}' })).status, 415);
  assert.equal((await request('POST', '/mission', { headers: j, body: '{oops' })).status, 400);
  assert.equal((await post('   ')).status, 400);
  assert.equal((await post('a'.repeat(2001))).status, 400);
  assert.equal((await request('POST', '/mission', { headers: j, body: JSON.stringify({ mission: 'a'.repeat(20000) }) })).status, 413);
});

test('solo sirve la oficina, no el resto del repositorio', { skip }, async () => {
  assert.equal((await request('GET', '/')).status, 200);
  assert.equal((await request('GET', '/js/core.js')).status, 200);
  assert.equal((await request('GET', '/css/styles.css')).status, 200);
  for (const p of ['/.opencode/opencode.jsonc', '/bridge/mission-server.mjs', '/state/bridge.token', '/package.json', '/README.md', '/js/..%2f..%2fREADME.md']) {
    assert.equal((await request('GET', p)).status, 404, p);
  }
});

test('ciclo de misión: en curso -> una sola a la vez -> terminada', { skip }, async () => {
  const a = await post('/oficina crea una API');
  assert.equal(a.status, 200);
  assert.equal((await state()).status, 'running');
  const b = await post('otra tarea');
  assert.equal(b.status, 409);
  const fin = await waitStatus('done');
  assert.equal(fin.error, '');
});

test('si opencode termina con error, el estado lo refleja y se puede reintentar', { skip }, async () => {
  assert.equal((await post('esto falla')).status, 200);
  const s = await waitStatus('error');
  assert.match(s.error, /código 3/);
  assert.equal(s.agents.planificador.status, 'error');
  assert.equal((await post('ahora bien')).status, 200);
  await waitStatus('done');
});
