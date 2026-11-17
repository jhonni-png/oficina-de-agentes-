#!/usr/bin/env bash
# Inicia el puente de la oficina y abre la interfaz 3D.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Oficina Agentes ==="

# Credenciales en memoria
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

# Puente en segundo plano
echo "Arrancando puente en 127.0.0.1:8787..."
node "$ROOT/bridge/mission-server.mjs" >"$ROOT/state/bridge.log" 2>&1 &
echo $! > "$ROOT/state/bridge.pid"

# Abrir navegador
if command -v xdg-open >/dev/null; then xdg-open "$ROOT/index.html";
elif command -v open >/dev/null; then open "$ROOT/index.html"; fi

echo "Listo. Haz clic en la computadora de la mesa y escribe /oficina <tarea>."
