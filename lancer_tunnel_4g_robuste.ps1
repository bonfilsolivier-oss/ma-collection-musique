
$maxRetries = 1000
$retryCount = 0

Write-Host "==================================================="
Write-Host "TUNNEL D'ACCES DISTANCE (AUTO-RESTART)"
Write-Host "Lien stable : https://olivier-collection.loca.lt"
Write-Host "==================================================="
Write-Host ""

while ($true) {
    try {
        Write-Host "Démarrage du tunnel..."
        # On lance localtunnel via node directement
        node node_modules/localtunnel/bin/lt.js --port 8080 --subdomain olivier-collection
    }
    catch {
        Write-Host "Erreur détectée : $_"
    }
    
    Write-Host "Le tunnel s'est coupé. Redémarrage dans 2 secondes..."
    Start-Sleep -Seconds 2
}
