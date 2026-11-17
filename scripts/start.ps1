# Inicia el puente de la oficina y abre la interfaz 3D (la sirve el propio puente).
# Uso: .\scripts\start.ps1   (o: powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1)
# Para detenerlo: .\scripts\stop.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$state = Join-Path $root 'state'
$port = if ($env:OFICINA_PORT) { $env:OFICINA_PORT } else { '8787' }
New-Item -ItemType Directory -Force -Path $state | Out-Null

Write-Host '=== Oficina de Agentes ===' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Node.js (>= 18). Instalalo desde https://nodejs.org' -ForegroundColor Red
  exit 1
}
if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  Write-Host "Aviso: no encuentro 'opencode' en el PATH. La oficina abrira, pero las misiones fallaran hasta que lo instales." -ForegroundColor Yellow
}

# 1. Cargar credenciales en memoria (si el usuario aún no lo hizo)
$keys = @('GROQ_API_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY', 'NVIDIA_NIM_API_KEY', 'NVIDIA_API_KEY')
$missing = $keys | Where-Object { -not [Environment]::GetEnvironmentVariable($_, 'Process') }
if ($missing) {
  Write-Host 'Cargando credenciales (entrada oculta)...' -ForegroundColor Yellow
  foreach ($name in @('GROQ_API_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY', 'NVIDIA_NIM_API_KEY')) {
    if ([Environment]::GetEnvironmentVariable($name, 'Process')) { continue }
    $secure = Read-Host "$name (oculto)" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $valor = $null
    try {
      $valor = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
      [Environment]::SetEnvironmentVariable($name, $valor, 'Process')
      if ($name -eq 'NVIDIA_NIM_API_KEY') { [Environment]::SetEnvironmentVariable('NVIDIA_API_KEY', $valor, 'Process') }
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
      if ($valor) { $valor = $null }
    }
  }
}

# 2. Instalar el comando /oficina globalmente en OpenCode
$cmdSrc = Join-Path $root '.opencode\commands\oficina.md'
$cmdDst = Join-Path $HOME '.config\opencode\commands\oficina.md'
if (Test-Path $cmdSrc) {
  New-Item -ItemType Directory -Force -Path (Split-Path $cmdDst) | Out-Null
  Copy-Item $cmdSrc $cmdDst -Force
  Write-Host 'Comando /oficina instalado en OpenCode.' -ForegroundColor Green
}

# 3. Si quedó un puente anterior corriendo, lo detenemos (solo si de verdad es el puente)
$pidFile = Join-Path $state 'bridge.pid'
$tokenFile = Join-Path $state 'bridge.token'
if (Test-Path $pidFile) {
  $old = (Get-Content $pidFile -Raw).Trim()
  if ($old -match '^\d+$') {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$old" -ErrorAction SilentlyContinue
    if ($p -and $p.CommandLine -match 'mission-server\.mjs') {
      Write-Host "Deteniendo el puente anterior (PID $old)..." -ForegroundColor Yellow
      Stop-Process -Id ([int]$old) -Force
      Start-Sleep -Seconds 1
    }
  }
}
Remove-Item $tokenFile, $pidFile -ErrorAction SilentlyContinue

# 4. Arrancar el puente en segundo plano
$srv = Join-Path $root 'bridge\mission-server.mjs'
Write-Host "Arrancando puente en 127.0.0.1:$port..." -ForegroundColor Yellow
$env:OFICINA_PORT = $port
$proc = Start-Process -FilePath 'node' -ArgumentList "`"$srv`"" -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $state 'bridge.log') -RedirectStandardError (Join-Path $state 'bridge.err.log') -PassThru

# 5. Esperar a que el puente publique su token (hasta ~10 s)
for ($i = 0; $i -lt 50; $i++) {
  if ((Test-Path $tokenFile) -and ((Get-Item $tokenFile).Length -gt 0)) { break }
  if ($proc.HasExited) { break }
  Start-Sleep -Milliseconds 200
}
if (-not ((Test-Path $tokenFile) -and ((Get-Item $tokenFile).Length -gt 0))) {
  Write-Host 'El puente no arranco. Ultima salida de state\bridge.err.log:' -ForegroundColor Red
  if (Test-Path (Join-Path $state 'bridge.err.log')) { Get-Content (Join-Path $state 'bridge.err.log') -Tail 5 }
  exit 1
}
$token = (Get-Content $tokenFile -Raw).Trim()

# 6. Abrir la oficina en el navegador (el token viaja en el # de la URL, no llega a ningún servidor)
Write-Host 'Abriendo oficina 3D...' -ForegroundColor Green
Start-Process "http://127.0.0.1:$port/#bridge=$token"

Write-Host ''
Write-Host 'Listo. Haz clic en la computadora de la mesa y escribe /oficina <tarea>.' -ForegroundColor Cyan
Write-Host "Puente corriendo con PID $($proc.Id). Para detenerlo: .\scripts\stop.ps1" -ForegroundColor DarkGray
