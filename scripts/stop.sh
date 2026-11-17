#!/usr/bin/env bash
# Detiene el puente de la oficina iniciado con scripts/start.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$ROOT/state/bridge.pid"

if [[ ! -f "$PIDFILE" ]]; then echo "No hay un puente registrado (state/bridge.pid no existe)."; exit 0; fi
pid="$(cat "$PIDFILE")"
if [[ -n "$pid" ]] && ps -p "$pid" -o args= 2>/dev/null | grep -q "mission-server.mjs"; then
  kill "$pid" && echo "Puente detenido (PID $pid)."
else
  echo "El PID $pid ya no es el puente; limpio los archivos de estado."
  rm -f "$PIDFILE" "$ROOT/state/bridge.token"
fi
