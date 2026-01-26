Add-Type -AssemblyName System.Net
$prefixLocal = "http://localhost:8080/"
$prefixAll = "http://+:8080/"
$listener = New-Object System.Net.HttpListener
$useAll = $false
try { $listener.Prefixes.Add($prefixAll); $useAll = $true } catch { $listener.Prefixes.Add($prefixLocal) }
try {
  $listener.Start()
  Write-Output "Serveur démarré: $prefixLocal"
} catch {
  if ($useAll) {
    try {
      $listener.Prefixes.Clear()
      $listener.Prefixes.Add($prefixLocal)
      $listener.Start()
      Write-Output "Serveur démarré: $prefixLocal"
    } catch { throw }
  } else { throw }
}
try {
  $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' }
  foreach ($ip in $ips) { Write-Output ("Accès réseau: http://{0}:8080/olivier-discographie/" -f $ip) }
} catch {}
$webDir = Join-Path (Get-Location) "web"
$dataDir = Join-Path (Get-Location) "data"

function Get-MimeType($path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".svg" { "image/svg+xml" }
    default { "application/octet-stream" }
  }
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = $req.Url.AbsolutePath
    if ($path -eq "/" -or $path -eq "/index.html" -or $path -eq "/olivier-discographie" -or $path -eq "/olivier-discographie/") {
      $file = Join-Path $webDir "index.html"
    } elseif ($path.StartsWith("/data/")) {
      $rel = $path.Substring(6)
      $file = Join-Path $dataDir $rel
    } else {
      $file = Join-Path $webDir $path.TrimStart("/")
    }
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $res.ContentType = Get-MimeType $file
      $res.ContentLength64 = $bytes.Length
      $res.StatusCode = 200
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $res.ContentType = "text/plain; charset=utf-8"
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    $res.StatusCode = 500
    $err = [System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
    $res.ContentType = "text/plain; charset=utf-8"
    $res.ContentLength64 = $err.Length
    $res.OutputStream.Write($err, 0, $err.Length)
  } finally {
    $res.OutputStream.Close()
  }
}
