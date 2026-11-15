async function runMission() {
  const mission = $('mission-input').value.trim();
  const { N8N_WEBHOOK_URL } = loadConfig();
  if (!mission) { log('Escribe una misión primero.', 'warn'); $('mission-input').focus(); return; }
  if (!N8N_WEBHOOK_URL) { log('Falta N8N_WEBHOOK_URL en Configuración.', 'warn'); openSettings(); return; }

  const btn = $('btn-run');
  btn.disabled = true;
  log('Enviando misión a n8n: ' + mission, 'info');
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission, source: 'ai-agent-3d-office', timestamp: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    log('Misión aceptada por n8n (HTTP ' + res.status + ').', 'ok');
    $('mission-input').value = '';
  } catch (e) {
    log('Error al llamar a n8n: ' + e.message + ' (revisa la URL y CORS).', 'err');
  } finally {
    btn.disabled = false;
  }
}

