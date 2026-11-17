# Inicia el puente de la oficina y abre la interfaz 3D en el navegador.
# Uso: .\scripts\start.ps1   (o: powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host '=== Oficina Agentes ===' -ForegroundColor Cyan

# 1. Cargar credenciales en memoria (si el usuario aún no lo hizo)
$keys = @('GROQ_API_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY', 'NVIDIA_NIM_API_KEY', 'NVIDIA_API_KEY')
$missing = $keys | Where-Object { -not [Environment]::GetEnvironmentVariable($_, 'Process') }
if ($missing) {
  Write-Host 'Cargando credenciales (entrada oculto)...' -ForegroundColor Yellow
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

# 3. Arrancar el puente en segundo plano
$srv = Join-Path $root 'bridge\mission-server.mjs'
Write-Host 'Arrancando puente en 127.0.0.1:8787...' -ForegroundColor Yellow
$proc = Start-Process -FilePath 'node' -ArgumentList "`"$srv`"" -WorkingDirectory $root -WindowStyle Hidden -PassThru
$proc | Out-Null
Start-Sleep -Seconds 1

# 4. Abrir la oficina en el navegador
$html = Join-Path $root 'index.html'
Write-Host 'Abriendo oficina 3D...' -ForegroundColor Green
Start-Process $html

Write-Host ''
Write-Host 'Listo. Haz clic en la computadora de la mesa y escribe /oficina <tarea>.' -ForegroundColor Cyan
Write-Host "Puente corriendo con PID $($proc.Id). Para detenerlo: Stop-Process -Id $($proc.Id)" -ForegroundColor DarkGray
