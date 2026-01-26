$ErrorActionPreference = 'Stop'
$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $admin) { Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs; exit }

$rule = 'Collection Musique Node 8080'
try { & netsh advfirewall firewall delete rule name=$rule | Out-Null } catch {}

$p = $null
try { $p = (Get-Command node -ErrorAction SilentlyContinue).Source } catch {}
if (-not $p -and $env:ProgramFiles) { $p = Join-Path $env:ProgramFiles 'nodejs\node.exe' }
if (-not (Test-Path $p)) { $p = $null }

if ($p) {
  & netsh advfirewall firewall add rule name=$rule dir=in action=allow program="$p" protocol=TCP localport=8080 profile=private enable=yes | Out-Null
} else {
  & netsh advfirewall firewall add rule name=($rule + ' (port seulement)') dir=in action=allow protocol=TCP localport=8080 profile=private enable=yes | Out-Null
}
'OK'
