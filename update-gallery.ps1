# Auto-indexing script for photography portfolio collections
# Run this script in PowerShell whenever you add or modify image folders.
# Sorts photos inside each collection chronologically (newest first) based on Date Taken EXIF metadata.

$collectionsDir = Join-Path $PSScriptRoot "images\collections"
$outputFile = Join-Path $PSScriptRoot "js\collections-data.js"
$customMetadataFile = Join-Path $PSScriptRoot "js\custom-metadata.json"

if (-not (Test-Path $collectionsDir)) {
    Write-Error "Collections directory not found: $collectionsDir"
    exit
}

$customMetadata = $null
if (Test-Path $customMetadataFile) {
    try {
        $jsonContent = [System.IO.File]::ReadAllText($customMetadataFile, [System.Text.Encoding]::UTF8)
        $customMetadata = ConvertFrom-Json $jsonContent
    } catch {
        Write-Warning "Failed to parse custom-metadata.json: $_"
    }
}

# Mapping function to transform folder names into elegant presentation titles
function Get-CollectionTitle ($folderName) {
    switch ($folderName) {
        "CaboDaRoca" { return "Cabo da Roca" }
        "CampingCostaVicentina2025" { return "Costa Vicentina Camping" }
        "Cruise Norway 2024" { return "Norway Cruise" }
        "EditedPasseioGracaBelem" { return "Passeio Graça & Belém" }
        "EditedRome" { return "Rome Recollections" }
        "FotitasPasseiosAina" { return "Portraits: Aina" }
        "London" { return "London Streets" }
        "LostFiles_until_May2026" { return "Lost Files (2026)" }
        "Pariris" { return "Paris: Collection I" }
        "Pariris2" { return "Paris: Collection II" }
        "PasseioSofia" { return "Portraits: Sofia" }
        "Random" { return "Random Moments" }
        "edited_passeio_02_06_2024" { return "Lisbon Walk (June 2024)" }
        "jun25" { return "June 2025" }
        "tagus" { return "Tagus Alverca" }
        default {
            # Fallback formatting: Add spaces before capital letters and swap separators
            $formatted = $folderName -creplace '([a-z])([A-Z])', '$1 $2'
            $formatted = $formatted -replace '[-_]', ' '
            return $formatted
        }
    }
}

function Get-FriendlyDate ($date) {
    $monthsPt = @{
        1 = "Janeiro"; 2 = "Fevereiro"; 3 = "Março"; 4 = "Abril"; 5 = "Maio"; 6 = "Junho"
        7 = "Julho"; 8 = "Agosto"; 9 = "Setembro"; 10 = "Outubro"; 11 = "Novembro"; 12 = "Dezembro"
    }
    $day = $date.Day
    $month = $monthsPt[$date.Month]
    $year = $date.Year
    return "$day de $month de $year"
}

Write-Host "Scanning collections under: $collectionsDir" -ForegroundColor Cyan

# Instantiate COM shell object once for metadata extraction
$shell = New-Object -ComObject Shell.Application
$collections = Get-ChildItem -Path $collectionsDir -Directory
$data = @()

foreach ($col in $collections) {
    $colName = $col.Name
    
    $override = $null
    if ($customMetadata -and $customMetadata.PSObject.Properties[$colName]) {
        $override = $customMetadata.$colName
    }

    if ($override -and $override.title) {
        $colTitle = $override.title
    } else {
        $colTitle = Get-CollectionTitle $colName
    }
    
    # Get all image files in this subfolder
    $images = Get-ChildItem -Path $col.FullName -File | Where-Object { 
        $_.Extension -match '\.(jpg|jpeg|png|webp)$' 
    }
    
    if ($images.Count -eq 0) {
        Write-Host "  Skipping folder: $colName (No images found)" -ForegroundColor Yellow
        continue
    }

    Write-Host "  Found Collection: '$colTitle' ($colName) with $($images.Count) images" -ForegroundColor Green
    
    # Get COM shell Namespace for metadata extraction
    $shellFolder = $shell.NameSpace($col.FullName)
    
    # Detect the shell column index for "Date taken" (localized)
    $dateIndex = -1
    for ($i = 0; $i -lt 300; $i++) {
        $headerName = $shellFolder.GetDetailsOf($null, $i)
        if ($headerName -match '(?i)(date taken|data de tirada|tirada em|date|data)') {
            if ($headerName -match '(?i)(taken|tirada)') {
                $dateIndex = $i
                break
            }
            if ($dateIndex -eq -1) {
                $dateIndex = $i
            }
        }
    }
    
    # Fallback to Date Modified (index 3) if no date header matched
    if ($dateIndex -eq -1) { $dateIndex = 3 }
    
    $photoObjects = @()
    
    foreach ($img in $images) {
        $shellFile = $shellFolder.ParseName($img.Name)
        $dateStr = $shellFolder.GetDetailsOf($shellFile, $dateIndex)
        
        $parsedDate = $img.LastWriteTime
        if ($dateStr) {
            # Strip out non-ASCII characters (like LTR/RTL marks \u200e sometimes injected by Windows)
            $cleanDateStr = $dateStr -replace '[^\x20-\x7E]', ''
            try {
                $parsedDate = [DateTime]::Parse($cleanDateStr)
            } catch {
                # Fallback remains $img.LastWriteTime
            }
        }
        
        $photoObjects += [PSCustomObject]@{
            Path = "images/collections/$colName/$($img.Name)"
            Date = $parsedDate
            Name = $img.Name
        }
    }
    
    # Sort chronologically descending (newest first)
    $sortedPhotos = $photoObjects | Sort-Object Date -Descending
    
    # Set the first photo of the sorted array as the cover photo, unless overridden
    if ($override -and $override.cover) {
        $cover = $override.cover
    } else {
        $cover = $sortedPhotos[0].Path
    }
    
    if ($override -and $override.date) {
        $collectionDate = $override.date
        try {
            $parsedOverrideDate = [DateTime]::Parse($collectionDate)
            $collectionFriendlyDate = Get-FriendlyDate $parsedOverrideDate
        } catch {
            $collectionFriendlyDate = $override.friendlyDate
        }
    } else {
        $collectionDate = $sortedPhotos[0].Date.ToString("yyyy-MM-ddTHH:mm:ss")
        $collectionFriendlyDate = Get-FriendlyDate $sortedPhotos[0].Date
    }

    if ($override -and $override.friendlyDate -and -not $override.date) {
        $collectionFriendlyDate = $override.friendlyDate
    }

    # Log sorting success for visual confirmation
    $newestDate = $sortedPhotos[0].Date.ToString("yyyy-MM-dd")
    $oldestDate = $sortedPhotos[-1].Date.ToString("yyyy-MM-dd")
    Write-Host "    Sorted chronologically: Newest ($newestDate) -> Oldest ($oldestDate)" -ForegroundColor Gray

    # Build image path object lines
    $imagePathLines = @()
    foreach ($p in $sortedPhotos) {
        $imagePathLines += "{ path: `"$($p.Path)`", date: `"$($p.Date.ToString('yyyy-MM-ddTHH:mm:ss'))`" }"
    }
    
    # Create collection record
    $colRecord = @"
    "$colName": {
        id: "$colName",
        title: "$colTitle",
        cover: "$cover",
        count: $($images.Count),
        date: "$collectionDate",
        friendlyDate: "$collectionFriendlyDate",
        photos: [
            $( $imagePathLines -join ",`n            " )
        ]
    }
"@
    $data += $colRecord
}

# Write JS file output
$jsContent = @"
// Auto-generated collections registry database. Do not edit manually.
// Regenerate by running update-gallery.ps1

const collectionsData = {
$($data -join ",`n")
};
"@

[System.IO.File]::WriteAllText($outputFile, $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Successfully generated database file: $outputFile" -ForegroundColor Cyan
