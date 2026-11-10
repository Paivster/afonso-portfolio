# Pure PowerShell Local Development Web Server
# Run this script to view your website locally. Close the console window to stop the server.

$port = 8000
$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Error "Failed to start server. Port $port may already be in use. Details: $_"
    exit
}

Write-Host "=============================================" -ForegroundColor DarkYellow
Write-Host "  PHOTOGRAPHY PORTFOLIO LOCAL DEV SERVER" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor DarkYellow
Write-Host "  Serving files from: $rootPath"
Write-Host "  Local URL:          http://localhost:$port/" -ForegroundColor Green
Write-Host "  To stop the server: Close this window or press Ctrl+C" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor DarkYellow

# Automatically open default browser
Start-Process "http://localhost:$port/index.html"

# Serve Loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        
        # API Handler for CMS Config updates
        if ($request.HttpMethod -eq "POST" -and $localPath -eq "/api/save-config") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()
            
            $customMetadataFile = Join-Path $rootPath "js\custom-metadata.json"
            [System.IO.File]::WriteAllText($customMetadataFile, $body, [System.Text.Encoding]::UTF8)
            
            # Execute update-gallery.ps1 to compile new metadata database
            & powershell.exe -ExecutionPolicy Bypass -File (Join-Path $rootPath "update-gallery.ps1")

            # Automatically synchronize with GitHub repository folder
            $gitRepoDir = Join-Path (Split-Path $rootPath -Parent) "afonso-portfolio"
            if (Test-Path $gitRepoDir) {
                Copy-Item (Join-Path $rootPath "js\custom-metadata.json") (Join-Path $gitRepoDir "js\custom-metadata.json") -Force -ErrorAction SilentlyContinue
                Copy-Item (Join-Path $rootPath "js\collections-data.js") (Join-Path $gitRepoDir "js\collections-data.js") -Force -ErrorAction SilentlyContinue
            }
            
            $response.StatusCode = 200
            $successMsg = [System.Text.Encoding]::UTF8.GetBytes('{"success": true, "message": "Configuracao guardada com sucesso!"}')
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $successMsg.Length
            $response.OutputStream.Write($successMsg, 0, $successMsg.Length)
            $response.OutputStream.Close()
            continue
        }
        
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        # Clean up path separators
        $relativePath = $localPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        $filePath = Join-Path $rootPath $relativePath
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content Type Mapping
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".webp" { $response.ContentType = "image/webp" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".ico"  { $response.ContentType = "image/x-icon" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            # Add cache headers for development (prevent caching)
            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.Headers.Add("Pragma", "no-cache")
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # File Not Found
            $response.StatusCode = 404
            $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1><p>File not found: $localPath</p>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $notFoundMsg.Length
            $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
        }
        $response.OutputStream.Close()
    } catch {
        # Catch unexpected client disconnects silently
    }
}
