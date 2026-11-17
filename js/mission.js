/* ---------- Envío de la misión (js/mission.js) ----------
   Detecta el prefijo /oficina y envía la tarea al endpoint configurado.
   Prioridad: N8N_WEBHOOK_URL (si existe) > puente local 127.0.0.1:8787.
*/
async function runMission() {
  let mission = $('mission-input').value.trim();
  if (!mission) { log('Escribe una misión primero.', 'warn'); $('mission-input').focus(); return; }

  // Comando /oficina: se acepta con o sin prefijo (el panel lo añade solo).
  let isOficina = false;
  if (mission.startsWith('/oficina')) {
    isOficina = true;
    mission = mission.slice(8).trim();
    if (!mission) { log('Escribe una tarea después de /oficina.', 'warn'); $('mission-input').focus(); return; }
  }

  const { N8N_WEBHOOK_URL } = loadConfig();
  const endpoint = N8N_WEBHOOK_URL || 'http://127.0.0.1:8787/mission';

  const btn = $('btn-run');
  btn.disabled = true;
  if (typeof window.pushCentralLog === 'function') {
    window.pushCentralLog('> ' + (isOficina ? '/oficina ' : '') + mission, 'warn');
  }
  log((isOficina ? '🏢 Pipeline multiagente: ' : 'Enviando misión: ') + mission, 'info');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mission: (isOficina ? '/oficina ' : '') + mission,
        source: 'oficina-de-agentes', timestamp: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let payload = null;
    try { payload = await res.json(); } catch (_) {}
    log('Misión aceptada' + (payload && payload.sessionID ? ' · sesión ' + payload.sessionID : '') + '.', 'ok');
    $('mission-input').value = '';
  } catch (e) {
    const hint = /Failed to fetch|NetworkError|load failed/i.test(e.message)
      ? ' ¿Está corriendo el puente? node bridge/mission-server.mjs'
      : '';
    log('Error al enviar la misión: ' + e.message + hint, 'err');
    if (typeof window.pushCentralLog === 'function') window.pushCentralLog('✖ ' + e.message, 'err');
  } finally {
    btn.disabled = false;
  }
}
