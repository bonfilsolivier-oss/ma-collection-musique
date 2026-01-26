$w = Add-Type -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);' -Name "Win32" -Namespace Win32 -PassThru

# ES_CONTINUOUS | ES_SYSTEM_REQUIRED (Prevent sleep, allow screen off)
# Use decimal values to avoid PowerShell hex signed/unsigned issues
$flags = [uint32]2147483649
$w::SetThreadExecutionState($flags)

Write-Host "==================================================="
Write-Host "SERVEUR PROTEGE CONTRE LA VEILLE AUTOMATIQUE"
Write-Host "Le PC ne se mettra pas en veille tout seul."
Write-Host "Vous pouvez éteindre l'écran manuellement ou utiliser le script eteindre_ecran.ps1."
Write-Host "ATTENTION: Si vous forcez la veille (Menu Démarrer > Veille), le serveur s'arrêtera quand même."
Write-Host "==================================================="
Write-Host ""

try {
    node server.js
} finally {
    # Reset execution state when server stops
    # 0x80000000 (ES_CONTINUOUS) -> 2147483648
    $resetFlags = [uint32]2147483648
    $w::SetThreadExecutionState($resetFlags)
}
