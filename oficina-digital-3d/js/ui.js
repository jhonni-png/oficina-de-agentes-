let demoTimer = null;
const DEMO_TEXTS = {
  planificador: ['Analizando requisitos...', 'Dividiendo tareas', 'Plan listo'],
  arquitecto: ['Diseñando estructura...', 'Definiendo módulos', 'Arquitectura aprobada'],
  constructor: ['Escribiendo código...', 'Compilando', 'Build exitoso'],
  auditor: ['Revisando calidad...', 'Buscando fallos', 'Auditoría completa']
};
function demoTick() {
  const id = AGENT_IDS[Math.floor(Math.random() * AGENT_IDS.length)];
  const status = VALID_STATUS[Math.floor(Math.random() * VALID_STATUS.length)];
  const texts = DEMO_TEXTS[id];
  const text = status === 'idle' ? '' : status === 'error' ? 'Fallo simulado' : texts[Math.floor(Math.random() * texts.length)];
  handleAgentUpdate(id, status, text, 'demo');
}
function toggleDemo() {
  const btn = $('btn-demo');
  if (demoTimer) {
    clearInterval(demoTimer); demoTimer = null;
    btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Modo Demo';
    log('Modo Demo detenido.', 'info');
    setConn(sbChannel ? 'ok' : 'off', sbChannel ? 'Conectado a Supabase Realtime' : 'Sin conexión a Supabase');
  } else {
    demoTick();
    demoTimer = setInterval(demoTick, 3000);
    btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Detener Demo';
    log('Modo Demo activo: un cambio cada 3 s.', 'warn');
    setConn('demo', 'Modo Demo activo');
  }
}

function openSettings() {
  const cfg = loadConfig();
  $('cfg-supabase-url').value = cfg.SUPABASE_URL;
  $('cfg-supabase-key').value = cfg.SUPABASE_PUBLISHABLE_KEY;
  $('cfg-n8n-url').value = cfg.N8N_WEBHOOK_URL;
  $('settings-modal').classList.add('open');
  $('cfg-supabase-url').focus();
}
function closeSettings() { $('settings-modal').classList.remove('open'); }
function saveSettings() {
  localStorage.setItem(LS_KEYS.url, $('cfg-supabase-url').value.trim());
  localStorage.setItem(LS_KEYS.key, $('cfg-supabase-key').value.trim());
  localStorage.setItem(LS_KEYS.n8n, $('cfg-n8n-url').value.trim());
  log('Configuración guardada.', 'ok');
  closeSettings();
  connectSupabase();
}

function setLogsOpen(open) { $('logs-panel').classList.toggle('open', open); }

document.addEventListener('DOMContentLoaded', () => {
  buildAgentBar();
  $('btn-run').addEventListener('click', runMission);
  $('mission-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') runMission(); });
  $('btn-demo').addEventListener('click', toggleDemo);
  $('btn-settings').addEventListener('click', openSettings);
  $('cfg-cancel').addEventListener('click', closeSettings);
  $('cfg-save').addEventListener('click', saveSettings);
  $('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeSettings(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });
  $('logs-toggle').addEventListener('click', () => setLogsOpen(true));
  $('btn-logs-close').addEventListener('click', () => setLogsOpen(false));
  $('btn-logs-clear').addEventListener('click', () => { $('logs-list').innerHTML = ''; });

  log('Oficina lista. Usa Modo Demo para probar sin gastar tokens.', 'info');
  connectSupabase();
});
