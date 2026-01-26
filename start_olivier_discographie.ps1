param(
  [string]$Port = '8080'
)

function Test-Server($url) {
  try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}

$root = Split-Path -Parent $PSCommandPath
$serverScript = Join-Path $root 'ps_server.ps1'
$baseUrl = "http://localhost:$Port/"
$targetUrl = "$baseUrl" + 'olivier-discographie/'

function New-MultiIco($sourceJpg, $targetIco) {
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Bitmap]::FromFile($sourceJpg)
  $sizes = 16,32,48,64,128,256
  $pngs = @()
  foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $s, $s)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += ,$ms.ToArray()
    $ms.Close()
    $bmp.Dispose()
  }
  $fs = [System.IO.File]::Open($targetIco, [System.IO.FileMode]::Create)
  $bw = New-Object System.IO.BinaryWriter($fs)
  $bw.Write([UInt16]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]$pngs.Count)
  $offset = [UInt32](6 + 16 * $pngs.Count)
  for ($i = 0; $i -lt $pngs.Count; $i++) {
    $size = $sizes[$i]
    if ($size -eq 256) { $w = [byte]0 } else { $w = [byte]$size }
    $h = $w
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([UInt16]0)
    $bw.Write([UInt16]0)
    $data = [byte[]]$pngs[$i]
    $bw.Write([UInt32]$data.Length)
    $bw.Write([UInt32]$offset)
    $offset = [UInt32]($offset + $data.Length)
  }
  for ($i = 0; $i -lt $pngs.Count; $i++) {
    $bw.Write([byte[]]$pngs[$i])
  }
  $bw.Close()
  $fs.Close()
  $img.Dispose()
}

try {
  $jpg = Join-Path $root 'web\me.jpg'
  $ico = Join-Path $root 'web\me.ico'
  if ((Test-Path $jpg) -and -not (Test-Path $ico)) {
    New-MultiIco -sourceJpg $jpg -targetIco $ico
  }
} catch {}

try {
  $icoPath = Join-Path $root 'web\me.ico'
  if (Test-Path $icoPath) {
    $ws = New-Object -ComObject WScript.Shell
    $desktopLocal = [Environment]::GetFolderPath('Desktop')
    $lnkLocal = Join-Path $desktopLocal 'Olivier Discographie.lnk'
    if (Test-Path $lnkLocal) {
      $s = $ws.CreateShortcut($lnkLocal)
      $s.IconLocation = $icoPath
      $s.Save()
    }
    if ($env:OneDrive) {
      $desktopOD = Join-Path $env:OneDrive 'Desktop'
      $lnkOD = Join-Path $desktopOD 'Olivier Discographie.lnk'
      if (Test-Path $lnkOD) {
        $s2 = $ws.CreateShortcut($lnkOD)
        $s2.IconLocation = $icoPath
        $s2.Save()
      }
    }
  }
} catch {}

function Start-Server() {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    Start-Process -WindowStyle Minimized -FilePath 'node' -ArgumentList 'server.js'
  } else {
    Start-Process -WindowStyle Minimized -FilePath 'powershell.exe' -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$serverScript`""
  }
}

if (-not (Test-Server $baseUrl)) { Start-Server; Start-Sleep -Seconds 1 }

try {
  Invoke-WebRequest -UseBasicParsing -Uri $targetUrl -TimeoutSec 2 | Out-Null
  Start-Process $targetUrl
} catch {
  Start-Process $baseUrl
}
