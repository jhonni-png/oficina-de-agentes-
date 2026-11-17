#!/usr/bin/env bash
# Inicia el puente de la oficina y abre la interfaz 3D (la sirve el propio puente).
# Uso: ./scripts/start.sh        (para detenerlo: ./scripts/stop.sh)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/state"
PORT="${OFICINA_PORT:-8787}"
mkdir -p "$STATE"

echo "=== Oficina de Agentes ==="

command -v node >/dev/null || { echo "Falta Node.js (>= 18). Instálalo desde https://nodejs.org"; exit 1; }
command -v opencode >/dev/null || echo "Aviso: no encuentro 'opencode' en el PATH. La oficina abrirá, pero las misiones fallarán hasta que lo instales."

# Credenciales en memoria (entrada oculta)
for key in GROQ_API_KEY OPENROUTER_API_KEY GEMINI_API_KEY NVIDIA_NIM_API_KEY; do
  if [[ -z "${!key:-}" ]]; then
    read -r -s -p "$key (oculto): " value; echo
    export "$key=$value"
  fi
done
[[ -n "${NVIDIA_NIM_API_KEY:-}" ]] && export NVIDIA_API_KEY="$NVIDIA_NIM_API_KEY"

# Comando /oficina global
mkdir -p "$HOME/.config/opencode/commands"
cp "$ROOT/.opencode/commands/oficina.md" "$HOME/.config/opencode/commands/oficina.md"

# Si quedó un puente anterior corriendo, lo detenemos (solo si de verdad es el puente).
if [[ -f "$STATE/bridge.pid" ]]; then
  old="$(cat "$STATE/bridge.pid" 2>/dev/null || true)"
  if [[ -n "$old" ]] && ps -p "$old" -o args= 2>/dev/null | grep -q "mission-server.mjs"; then
    echo "Deteniendo el puente anterior (PID $old)..."
    kill "$old" 2>/dev/null || true
    sleep 1
  fi
fi
rm -f "$STATE/bridge.token" "$STATE/bridge.pid"

# Puente en segundo plano
echo "Arrancando puente en 127.0.0.1:$PORT..."
OFICINA_PORT="$PORT" node "$ROOT/bridge/mission-server.mjs" >"$STATE/bridge.log" 2>&1 &
BRIDGE_PID=$!

# Esperamos a que el puente publique su token (hasta ~10 s)
for _ in $(seq 1 50); do
  [[ -s "$STATE/bridge.token" ]] && break
  kill -0 "$BRIDGE_PID" 2>/dev/null || break
  sleep 0.2
done
if [[ ! -s "$STATE/bridge.token" ]]; then
  echo "El puente no arrancó. Última salida de state/bridge.log:"
  tail -n 5 "$STATE/bridge.log" || true
  exit 1
fi

URL="http://127.0.0.1:$PORT/#bridge=$(cat "$STATE/bridge.token")"

# Abrir navegador
if command -v xdg-open >/dev/null; then xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null; then open "$URL" || true
else echo "Abre esta dirección en tu navegador: $URL"; fi

echo "Listo. Haz clic en la computadora de la mesa y escribe /oficina <tarea>."
echo "Puente con PID $BRIDGE_PID. Para detenerlo: ./scripts/stop.sh"
