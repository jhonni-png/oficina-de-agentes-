/* =====================================================================
   AI AGENT 3D OFFICE: BASES ESTRUCTURALES
   ===================================================================== */

const AGENT_IDS = ['planificador', 'arquitecto', 'constructor', 'auditor'];
const VALID_STATUS = ['idle', 'thinking', 'working', 'done', 'error'];
const STATUS_LABEL = { idle: 'En espera', thinking: 'Pensando', working: 'Trabajando', done: 'Terminado', error: 'Error' };
const LS_KEYS = { url: 'SUPABASE_URL', key: 'SUPABASE_PUBLISHABLE_KEY', legacyKey: 'SUPABASE_ANON_KEY', n8n: 'N8N_WEBHOOK_URL' };
const $ = (id) => document.getElementById(id);

const agentState = {};
AGENT_IDS.forEach((id) => { agentState[id] = { status: 'idle', screenText: '' }; });
window.agentState = agentState;

function loadConfig() {
  return {
    SUPABASE_URL: localStorage.getItem(LS_KEYS.url) || '',
    SUPABASE_PUBLISHABLE_KEY: localStorage.getItem(LS_KEYS.key) || localStorage.getItem(LS_KEYS.legacyKey) || '',
    N8N_WEBHOOK_URL: localStorage.getItem(LS_KEYS.n8n) || ''
  };
}

function log(message, level = 'info') {
  const list = $('logs-list');
  const line = document.createElement('div');
  line.className = 'log-line ' + level;
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = new Date().toLocaleTimeString('es-CO', { hour12: false });
  const m = document.createElement('span');
  m.className = 'm';
  m.textContent = message;
  line.append(t, m);
  list.appendChild(line);
  while (list.children.length > 300) list.removeChild(list.firstChild);
  list.scrollTop = list.scrollHeight;
}

function buildAgentBar() {
  const bar = $('agent-bar');
  AGENT_IDS.forEach((id) => {
    const chip = document.createElement('div');
    chip.className = 'agent-chip';
    chip.id = 'chip-' + id;
    chip.dataset.status = 'idle';
    chip.innerHTML = '<div class="name"></div><div class="status"></div><div class="screen"></div>';
    chip.querySelector('.name').textContent = id;
    bar.appendChild(chip);
  });
  AGENT_IDS.forEach((id) => renderChip(id));
}
function renderChip(id) {
  const chip = $('chip-' + id);
  if (!chip) return;
  const s = agentState[id];
  chip.dataset.status = s.status;
  chip.querySelector('.status').textContent = STATUS_LABEL[s.status] || s.status;
  chip.querySelector('.screen').textContent = s.screenText || '';
  chip.querySelector('.screen').title = s.screenText || '';
}

function handleAgentUpdate(agentId, status, screenText, source) {
  agentId = String(agentId || '').toLowerCase();
  if (!AGENT_IDS.includes(agentId)) { log('Agente desconocido: ' + agentId, 'warn'); return; }
  status = VALID_STATUS.includes(status) ? status : 'idle';
  screenText = screenText == null ? '' : String(screenText);

  agentState[agentId] = { status, screenText };
  renderChip(agentId);
  log('[' + source + '] ' + agentId + ' → ' + status + (screenText ? ': ' + screenText : ''), status === 'error' ? 'err' : status === 'done' ? 'ok' : 'info');

  try {
    if (typeof window.updateAgentMonitor3D === 'function') window.updateAgentMonitor3D(agentId, status, screenText);
  } catch (e) {
    log('Error en updateAgentMonitor3D: ' + e.message, 'err');
  }
  // Escribir también en la terminal de la computadora central
  try {
    if (typeof window.pushCentralLog === 'function') {
      const level = status === 'error' ? 'err' : status === 'done' ? 'ok' : 'info';
      window.pushCentralLog('[' + agentId.toUpperCase() + '] ' + (screenText || STATUS_LABEL[status] || status), level);
    }
  } catch (_) { /* la computadora es opcional */ }
}

