/* =====================================================================
   PUENTE LOCAL + PANEL DE CHAT (js/bridge.js)
   - Hace polling a /state del mission-server (127.0.0.1:8787) y
     actualiza los agentes cuando no hay Supabase.
   - Funciones del panel de la computadora: openComputer / closeComputer /
     sendFromComputer. La misión se envía al endpoint configurado.
   Se carga DESPUÉS de mission.js y ui.js.
   ===================================================================== */

const BRIDGE_BASE = 'http://127.0.0.1:8787';
let bridgeTimer = null;
let lastAgentSig = '';

async function pollBridge() {
  try {
    const res = await fetch(BRIDGE_BASE + '/state', { cache: 'no-store' });
    if (!res.ok) return;
    const st = await res.json();
    if (!st || !st.agents) return;
    const sig = AGENT_IDS.map((id) => {
      const a = st.agents[id] || {};
      return id + ':' + a.status + ':' + (a.screenText || '');
    }).join('|');
    if (sig !== lastAgentSig) {
      lastAgentSig = sig;
      AGENT_IDS.forEach((id) => {
        const a = st.agents[id];
        if (a) handleAgentUpdate(id, a.status, a.screenText, 'puente');
      });
      if (typeof log === 'function' && st.sessionID) {
        log('[puente] Actualización de ' + st.sessionID + ' · ' + st.status, st.status === 'error' ? 'err' : 'info');
      }
    }
    if (typeof setConn === 'function') {
      if (st.status === 'running') setConn('demo', 'Pipeline en curso · ' + (st.sessionID || ''));
      else if (st.status === 'done') setConn('ok', 'Pipeline completado · ' + (st.sessionID || ''));
      else if (st.status === 'error') setConn('error', 'Pipeline con error · ' + (st.sessionID || ''));
    }
  } catch (_) { /* puente no activo */ }
}

function startBridge() {
  if (bridgeTimer) return;
  pollBridge();
  bridgeTimer = setInterval(pollBridge, 1500);
}

/* ---------- Panel de la computadora central ---------- */
function fillComputerOutput() {
  const out = document.getElementById('computer-output');
  if (!out) return;
  out.innerHTML = '';
  const cc = window.centralComputer;
  if (cc && cc.lines) {
    cc.lines.forEach((entry) => {
      const ln = document.createElement('div'); ln.className = 'ln';
      const ts = document.createElement('span'); ts.className = 'ts'; ts.textContent = entry.time;
      const msg = document.createElement('span');
      msg.className = 'lvl-' + (['info','warn','err','ok','dim'].includes(entry.level) ? entry.level : 'info');
      msg.textContent = entry.text;
      ln.append(ts, msg); out.appendChild(ln);
    });
  }
  out.scrollTop = out.scrollHeight;
}

function openComputer() {
  const modal = document.getElementById('computer-modal');
  if (!modal) return;
  modal.classList.add('open');
  const hint = document.getElementById('computer-hint');
  if (hint) hint.style.display = 'none';
  fillComputerOutput();
  const input = document.getElementById('computer-input');
  if (input) setTimeout(() => input.focus(), 50);
  if (typeof log === 'function') log('🖥️ Terminal central abierta. Delega tareas aquí.', 'info');
}
window.openComputer = openComputer;

function closeComputer() {
  const modal = document.getElementById('computer-modal');
  if (modal) modal.classList.remove('open');
  const hint = document.getElementById('computer-hint');
  if (hint) hint.style.display = '';
}
window.closeComputer = closeComputer;

function sendFromComputer() {
  const input = document.getElementById('computer-input');
  if (!input) return;
  let text = input.value.trim();
  if (!text) return;
  if (!text.startsWith('/')) text = '/oficina ' + text;
  input.value = '';
  if (typeof window.pushCentralLog === 'function') window.pushCentralLog('> ' + text, 'warn');

  const missionInput = document.getElementById('mission-input');
  if (missionInput) missionInput.value = text;
  if (typeof runMission === 'function') runMission();
}
window.sendFromComputer = sendFromComputer;

/* ---------- Eventos del panel (se enlazan cuando el DOM ya existe) ---------- */
function wireComputerPanel() {
  const hint = document.getElementById('computer-hint');
  if (hint) hint.addEventListener('click', () => {
    if (typeof window.focusComputerCamera === 'function') window.focusComputerCamera();
    openComputer();
  });
  const cClose = document.getElementById('computer-close');
  if (cClose) cClose.addEventListener('click', closeComputer);
  const cModal = document.getElementById('computer-modal');
  if (cModal) cModal.addEventListener('click', (e) => { if (e.target.id === 'computer-modal') closeComputer(); });
  const cSend = document.getElementById('computer-send');
  if (cSend) cSend.addEventListener('click', sendFromComputer);
  const cInput = document.getElementById('computer-input');
  if (cInput) cInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendFromComputer(); }
  });
  const cClear = document.getElementById('computer-clear');
  if (cClear) cClear.addEventListener('click', () => {
    const out = document.getElementById('computer-output');
    if (out) out.innerHTML = '';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  wireComputerPanel();
  startBridge();
  // El puente local manda; Supabase queda como respaldo (lo conecta ui.js).
  fetch(BRIDGE_BASE + '/health', { cache: 'no-store' })
    .then((r) => { if (r.ok && typeof log === 'function') log('Puente oficina conectado en 127.0.0.1:8787.', 'ok'); })
    .catch(() => { if (typeof log === 'function') log('Puente no activo. Modo Demo disponible.', 'warn'); });
});

// Escape cierra el panel de la computadora también
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeComputer();
});
