param(
    [string]$collectionsDir = (Join-Path $PSScriptRoot "images\collections")
)

Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -Path $collectionsDir -Recurse -File -Include "*.jpg","*.jpeg","*.png"

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

$totalFiles = $files.Count
$processed = 0
$savedBytes = 0
$initialTotal = 0
$finalTotal = 0

Write-Host "Iniciando otimização de $totalFiles imagens..." -ForegroundColor Cyan

foreach ($file in $files) {
    try {
        $initialSize = $file.Length
        $initialTotal += $initialSize
        
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $ms = New-Object System.IO.MemoryStream(,$bytes)
        $img = [System.Drawing.Image]::FromStream($ms)
        
        $maxDim = 1920
        $scale = [math]::Min($maxDim / $img.Width, $maxDim / $img.Height)
        if ($scale -gt 1) { $scale = 1 }
        
        $newW = [int]($img.Width * $scale)
        $newH = [int]($img.Height * $scale)
        
        # Only re-encode if needs resize or is larger than 300KB
        if ($scale -lt 1 -or $initialSize -gt 350KB) {
            $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
            $gfx = [System.Drawing.Graphics]::FromImage($bmp)
            $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $gfx.DrawImage($img, 0, 0, $newW, $newH)
            
            $tempPath = [System.IO.Path]::GetTempFileName()
            $bmp.Save($tempPath, $codec, $encParams)
            
            $img.Dispose()
            $ms.Dispose()
            $gfx.Dispose()
            $bmp.Dispose()
            
            [System.IO.File]::Copy($tempPath, $file.FullName, $true)
            [System.IO.File]::Delete($tempPath)
            
            $newSize = (Get-Item $file.FullName).Length
            $finalTotal += $newSize
        } else {
            $img.Dispose()
            $ms.Dispose()
            $finalTotal += $initialSize
        }
        
        $processed++
        if ($processed % 100 -eq 0 -or $processed -eq $totalFiles) {
            Write-Host "Progresso: $processed / $totalFiles ($([math]::Round(($processed / $totalFiles) * 100))%)" -ForegroundColor Green
        }
    } catch {
        Write-Warning "Erro ao processar $($file.FullName): $_"
        $processed++
    }
}

$origMB = [math]::Round($initialTotal / 1MB, 2)
$finalMB = [math]::Round($finalTotal / 1MB, 2)
$reduction = [math]::Round((1 - ($finalTotal / $initialTotal)) * 100, 1)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "OTIMIZAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "Tamanho inicial: $origMB MB"
Write-Host "Tamanho final:   $finalMB MB"
Write-Host "Redução:         $reduction %"
Write-Host "==========================================" -ForegroundColor Cyan
