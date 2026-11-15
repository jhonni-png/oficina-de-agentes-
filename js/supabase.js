/* ---------- Supabase Realtime ---------- */
let sbClient = null;
let sbChannel = null;

function setConn(state, text) {
  const el = $('conn-status');
  el.dataset.state = state;
  el.textContent = text;
}

async function connectSupabase() {
  const cfg = loadConfig();
  if (sbChannel && sbClient) { try { await sbClient.removeChannel(sbChannel); } catch (_) {} }
  sbChannel = null; sbClient = null;

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
    setConn('off', 'Sin conexión a Supabase: configura las credenciales');
    log('Supabase sin configurar. Abre Configuración.', 'warn');
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    setConn('error', 'No se cargó la librería de Supabase');
    log('No se pudo cargar supabase-js desde el CDN.', 'err');
    return;
  }

  try {
    sbClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await sbClient.from('agent_states').select('*');
    if (error) throw error;
    (data || []).forEach((row) => handleAgentUpdate(row.agent_id, row.status, row.screen_text, 'supabase'));

    sbChannel = sbClient
      .channel('agent_states_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_states' }, (payload) => {
        const row = payload.new;
        if (row && row.agent_id) handleAgentUpdate(row.agent_id, row.status, row.screen_text, 'supabase');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setConn('ok', 'Conectado a Supabase Realtime'); log('Suscrito a agent_states.', 'ok'); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { setConn('error', 'Error de Realtime (' + status + ')'); log('Realtime: ' + status, 'err'); }
        else if (status === 'CLOSED') { setConn('off', 'Realtime cerrado'); }
      });
  } catch (e) {
    setConn('error', 'Error de conexión con Supabase');
    log('Supabase: ' + (e.message || e), 'err');
  }
}

