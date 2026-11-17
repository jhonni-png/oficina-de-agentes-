# Detiene el puente de la oficina iniciado con scripts\start.ps1.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$state = Join-Path $root 'state'
$pidFile = Join-Path $state 'bridge.pid'

if (-not (Test-Path $pidFile)) { Write-Host 'No hay un puente registrado (state\bridge.pid no existe).'; exit 0 }
$old = (Get-Content $pidFile -Raw).Trim()
$p = $null
if ($old -match '^\d+$') { $p = Get-CimInstance Win32_Process -Filter "ProcessId=$old" -ErrorAction SilentlyContinue }
if ($p -and $p.CommandLine -match 'mission-server\.mjs') {
  Stop-Process -Id ([int]$old) -Force
  Write-Host "Puente detenido (PID $old)." -ForegroundColor Green
} else {
  Write-Host "El PID $old ya no es el puente; limpio los archivos de estado."
}
Remove-Item $pidFile, (Join-Path $state 'bridge.token') -ErrorAction SilentlyContinue
