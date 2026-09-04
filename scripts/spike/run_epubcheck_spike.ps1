# OpenBook — EPUBCheck 5.3.0 Packaging Spike Script
# This script acquires official EPUBCheck 5.3.0 and Temurin JDK 21, performs jdeps analysis,
# builds a minimal jlink runtime, measures footprints and startup times, and tests CLI behavior.

$ErrorActionPreference = "Stop"
$SpikeDir = Join-Path $PSScriptRoot "..\..\.cache\spike"
$FixtureDir = Join-Path $PSScriptRoot "..\..\tests\fixtures\validation-spike"

if (-not (Test-Path $SpikeDir)) {
    New-Item -ItemType Directory -Path $SpikeDir -Force | Out-Null
}
if (-not (Test-Path $FixtureDir)) {
    New-Item -ItemType Directory -Path $FixtureDir -Force | Out-Null
}

Write-Host "=== 1. ACQUIRING EPUBCHECK 5.3.0 ==="
$EpubCheckZipUrl = "https://github.com/w3c/epubcheck/releases/download/v5.3.0/epubcheck-5.3.0.zip"
$EpubCheckZipPath = Join-Path $SpikeDir "epubcheck-5.3.0.zip"
$EpubCheckExtractPath = Join-Path $SpikeDir "epubcheck-5.3.0"
$ExpectedEpubCheckSha256 = "6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5"

if (-not (Test-Path $EpubCheckZipPath)) {
    Write-Host "Downloading official EPUBCheck 5.3.0 from: $EpubCheckZipUrl"
    Invoke-WebRequest -Uri $EpubCheckZipUrl -OutFile $EpubCheckZipPath
}

$EpubCheckHash = (Get-FileHash -Path $EpubCheckZipPath -Algorithm SHA256).Hash.ToLower()
$EpubCheckZipSize = (Get-Item $EpubCheckZipPath).Length
Write-Host "EPUBCheck 5.3.0 ZIP Size: $EpubCheckZipSize bytes ($([math]::Round($EpubCheckZipSize/1MB, 2)) MB)"
Write-Host "EPUBCheck 5.3.0 Calculated SHA-256: $EpubCheckHash"
Write-Host "EPUBCheck 5.3.0 Expected SHA-256:   $ExpectedEpubCheckSha256"

if ($EpubCheckHash -ne $ExpectedEpubCheckSha256) {
    throw "SECURITY ALERT: EPUBCheck 5.3.0 SHA-256 checksum mismatch! Calculated: $EpubCheckHash, Expected: $ExpectedEpubCheckSha256. Failing closed."
}
Write-Host "EPUBCheck 5.3.0 Checksum Verification: PASSED (Verified Match)"

if (-not (Test-Path $EpubCheckExtractPath)) {
    Write-Host "Extracting EPUBCheck 5.3.0..."
    Expand-Archive -Path $EpubCheckZipPath -DestinationPath $SpikeDir -Force
}

$EpubCheckJar = Join-Path $EpubCheckExtractPath "epubcheck.jar"
$EpubCheckLibs = Join-Path $EpubCheckExtractPath "lib"
$EpubCheckDirSize = (Get-ChildItem $EpubCheckExtractPath -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "EPUBCheck 5.3.0 Unpacked Directory Size: $EpubCheckDirSize bytes ($([math]::Round($EpubCheckDirSize/1MB, 2)) MB)"

Write-Host "`n=== 2. ACQUIRING CANDIDATE TEMURIN JDK 21 LTS (WINDOWS x64) ==="
# Pinned to exact candidate release: jdk-21.0.12.1+1 for deterministic spike repeatability
$TemurinZipUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip"
$TemurinZipPath = Join-Path $SpikeDir "temurin-21-jdk.zip"
$TemurinExtractDir = Join-Path $SpikeDir "temurin-21-jdk-extracted"
$ExpectedTemurinSha256 = "f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e"

if (-not (Test-Path $TemurinZipPath)) {
    Write-Host "Downloading Eclipse Temurin JDK 21.0.12.1+1 from: $TemurinZipUrl"
    Invoke-WebRequest -Uri $TemurinZipUrl -OutFile $TemurinZipPath
}

$TemurinHash = (Get-FileHash -Path $TemurinZipPath -Algorithm SHA256).Hash.ToLower()
$TemurinZipSize = (Get-Item $TemurinZipPath).Length
Write-Host "Temurin 21 JDK ZIP Size: $TemurinZipSize bytes ($([math]::Round($TemurinZipSize/1MB, 2)) MB)"
Write-Host "Temurin 21 JDK Calculated SHA-256: $TemurinHash"
Write-Host "Temurin 21 JDK Expected SHA-256:   $ExpectedTemurinSha256"

if ($TemurinHash -ne $ExpectedTemurinSha256) {
    throw "SECURITY ALERT: Temurin JDK 21 SHA-256 checksum mismatch! Calculated: $TemurinHash, Expected: $ExpectedTemurinSha256. Failing closed."
}
Write-Host "Temurin JDK 21 Checksum Verification: PASSED (Verified Match)"

if (-not (Test-Path $TemurinExtractDir)) {
    Write-Host "Extracting Temurin JDK 21..."
    New-Item -ItemType Directory -Path $TemurinExtractDir -Force | Out-Null
    Expand-Archive -Path $TemurinZipPath -DestinationPath $TemurinExtractDir -Force
}

$JdkHome = (Get-ChildItem -Directory $TemurinExtractDir | Select-Object -First 1).FullName
$FullJavaExe = Join-Path $JdkHome "bin\java.exe"
$JdepsExe = Join-Path $JdkHome "bin\jdeps.exe"
$JlinkExe = Join-Path $JdkHome "bin\jlink.exe"

$FullJdkSize = (Get-ChildItem $JdkHome -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Extracted JDK Home: $JdkHome"
Write-Host "Full JDK Directory Size: $FullJdkSize bytes ($([math]::Round($FullJdkSize/1MB, 2)) MB)"

# Java exact version check
$verPsi = New-Object System.Diagnostics.ProcessStartInfo
$verPsi.FileName = $FullJavaExe
$verPsi.Arguments = "-version"
$verPsi.RedirectStandardError = $true
$verPsi.UseShellExecute = $false
$verPsi.CreateNoWindow = $true
$verProc = [System.Diagnostics.Process]::Start($verPsi)
$JavaVersionOutput = $verProc.StandardError.ReadToEnd()
$verProc.WaitForExit()
Write-Host "Java Version String:`n$JavaVersionOutput"

Write-Host "`n=== 3. JDEPS MODULE DEPENDENCY ANALYSIS ==="
# Gather all jar files in EPUBCheck distribution
$AllJars = @($EpubCheckJar)
if (Test-Path $EpubCheckLibs) {
    $AllJars += (Get-ChildItem $EpubCheckLibs -Filter "*.jar").FullName
}

Write-Host "Analyzing $($AllJars.Count) JAR files for required Java SE modules..."

$jdepsPsi = New-Object System.Diagnostics.ProcessStartInfo
$jdepsPsi.FileName = $JdepsExe
$jdepsPsi.Arguments = "--multi-release 21 --print-module-deps --ignore-missing-deps " + (($AllJars | ForEach-Object { "`"$_`"" }) -join " ")
$jdepsPsi.RedirectStandardOutput = $true
$jdepsPsi.RedirectStandardError = $true
$jdepsPsi.UseShellExecute = $false
$jdepsPsi.CreateNoWindow = $true
$jdepsProc = [System.Diagnostics.Process]::Start($jdepsPsi)
$RequiredModulesRaw = $jdepsProc.StandardOutput.ReadToEnd()
$jdepsStderr = $jdepsProc.StandardError.ReadToEnd()
$jdepsProc.WaitForExit()

$detectedModules = @()
foreach ($line in ($RequiredModulesRaw -split "`r?`n")) {
    $trimmed = $line.Trim()
    if ($trimmed -and $trimmed -match '^[a-z0-9\._,]+$') {
        $detectedModules += ($trimmed -split ",")
    }
}
Write-Host "Raw jdeps module detection: $($detectedModules -join ',')"

# Comprehensive module inclusion covering EPUBCheck's Jing / Saxon / XML schema validation & runtime requirements
$EssentialModules = @(
    "java.base",
    "java.compiler",
    "java.desktop",
    "java.security.jgss",
    "java.sql",
    "jdk.unsupported",
    "java.xml",
    "java.logging",
    "java.naming",
    "java.management",
    "jdk.xml.dom",
    "jdk.crypto.ec",
    "jdk.zipfs",
    "jdk.localedata"
)

$ModuleList = ($detectedModules + $EssentialModules) | Select-Object -Unique | Where-Object { $_ }
$FinalModules = ($ModuleList -join ",")
Write-Host "Final modules selected for jlink: $FinalModules"

Write-Host "`n=== 4. BUILDING MINIMAL JLINK RUNTIME ==="
$JlinkOutputDir = Join-Path $SpikeDir "temurin-21-minimal-runtime"
if (Test-Path $JlinkOutputDir) {
    Remove-Item -Recurse -Force $JlinkOutputDir
}

$JlinkArgs = @(
    "--module-path", (Join-Path $JdkHome "jmods"),
    "--add-modules", $FinalModules,
    "--output", $JlinkOutputDir,
    "--strip-debug",
    "--no-header-files",
    "--no-man-pages",
    "--compress=zip-6"
)

Write-Host "Executing jlink with modules: $FinalModules..."
$jlinkPsi = New-Object System.Diagnostics.ProcessStartInfo
$jlinkPsi.FileName = $JlinkExe
$jlinkPsi.Arguments = "--module-path `"$((Join-Path $JdkHome "jmods"))`" --add-modules $FinalModules --output `"$JlinkOutputDir`" --strip-debug --no-header-files --no-man-pages --compress=zip-6"
$jlinkPsi.RedirectStandardOutput = $true
$jlinkPsi.RedirectStandardError = $true
$jlinkPsi.UseShellExecute = $false
$jlinkPsi.CreateNoWindow = $true
$jlinkProc = [System.Diagnostics.Process]::Start($jlinkPsi)
$jlinkStdout = $jlinkProc.StandardOutput.ReadToEnd()
$jlinkStderr = $jlinkProc.StandardError.ReadToEnd()
$jlinkProc.WaitForExit()

if ($jlinkProc.ExitCode -ne 0) {
    throw "jlink failed with exit code $($jlinkProc.ExitCode): $jlinkStderr"
}
if ($jlinkStderr) {
    Write-Host "jlink output/info: $jlinkStderr"
}

$MinimalJavaExe = Join-Path $JlinkOutputDir "bin\java.exe"
$MinimalRuntimeSize = (Get-ChildItem $JlinkOutputDir -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "jlink Minimal Runtime Size: $MinimalRuntimeSize bytes ($([math]::Round($MinimalRuntimeSize/1MB, 2)) MB)"
Write-Host "Size reduction from Full JDK: $([math]::Round((1 - ($MinimalRuntimeSize / $FullJdkSize)) * 100, 1))%"

Write-Host "`n=== 5. PREPARING VALIDATION FIXTURES ==="
# Helper to create EPUB zip with uncompressed mimetype
function Create-EpubFixture {
    param(
        [string]$SourceDir,
        [string]$OutEpub
    )
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path $OutEpub) { Remove-Item $OutEpub -Force }
    $MimetypeFile = Join-Path $SourceDir "mimetype"
    $TempZip = [System.IO.Compression.ZipFile]::Open($OutEpub, [System.IO.Compression.ZipArchiveMode]::Create)
    # 1. Add mimetype first without compression
    $Entry = $TempZip.CreateEntry("mimetype", [System.IO.Compression.CompressionLevel]::NoCompression)
    $Writer = New-Object System.IO.StreamWriter($Entry.Open(), [System.Text.Encoding]::ASCII)
    $Writer.Write("application/epub+zip")
    $Writer.Dispose()
    
    $baseDir = (Get-Item $SourceDir).FullName.TrimEnd('\', '/')
    Get-ChildItem -Path $baseDir -Recurse -File | Where-Object { $_.Name -ne "mimetype" } | ForEach-Object {
        $rel = $_.FullName.Substring($baseDir.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($TempZip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $TempZip.Dispose()
}

# 5.1 Valid minimal EPUB 3.3 fixture source
$ValidSrc = Join-Path $SpikeDir "fixture-src-valid"
if (Test-Path $ValidSrc) { Remove-Item -Recurse -Force $ValidSrc }
New-Item -ItemType Directory -Path (Join-Path $ValidSrc "META-INF") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $ValidSrc "EPUB") -Force | Out-Null

Set-Content (Join-Path $ValidSrc "mimetype") "application/epub+zip" -NoNewline
Set-Content (Join-Path $ValidSrc "META-INF\container.xml") @'
<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
'@

Set-Content (Join-Path $ValidSrc "EPUB\package.opf") @'
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:12345678-1234-5678-1234-567812345678</dc:identifier>
    <dc:title>Valid Minimal EPUB Spike Fixture</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-09-04T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>
'@

Set-Content (Join-Path $ValidSrc "EPUB\nav.xhtml") @'
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
  <head><title>Navigation</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Table of Contents</h1>
      <ol>
        <li><a href="chapter1.xhtml">Chapter 1</a></li>
      </ol>
    </nav>
  </body>
</html>
'@

Set-Content (Join-Path $ValidSrc "EPUB\chapter1.xhtml") @'
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
  <head><title>Chapter 1</title></head>
  <body>
    <h1>Chapter 1</h1>
    <p>This is a valid minimal EPUB 3.3 document for validation testing.</p>
  </body>
</html>
'@

$ValidEpub = Join-Path $FixtureDir "valid-minimal.epub"
Create-EpubFixture -SourceDir $ValidSrc -OutEpub $ValidEpub
Write-Host "Created valid fixture: $ValidEpub"

# 5.2 Invalid EPUB (Missing nav document declared in manifest)
$InvalidSrc = Join-Path $SpikeDir "fixture-src-invalid"
if (Test-Path $InvalidSrc) { Remove-Item -Recurse -Force $InvalidSrc }
New-Item -ItemType Directory -Path (Join-Path $InvalidSrc "META-INF") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $InvalidSrc "EPUB") -Force | Out-Null

Set-Content (Join-Path $InvalidSrc "mimetype") "application/epub+zip" -NoNewline
Set-Content (Join-Path $InvalidSrc "META-INF\container.xml") @'
<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
'@

# Missing nav item and broken references
Set-Content (Join-Path $InvalidSrc "EPUB\package.opf") @'
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:invalid-fixture-001</dc:identifier>
    <dc:title>Invalid EPUB Spike Fixture</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-09-04T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nonexistent-item"/>
  </spine>
</package>
'@

Set-Content (Join-Path $InvalidSrc "EPUB\chapter1.xhtml") @'
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head><title>Chapter 1</title></head>
  <body>
    <h1>Chapter 1</h1>
    <p>Missing closing tag or invalid navigation</p>
  </body>
</html>
'@

$InvalidEpub = Join-Path $FixtureDir "invalid-missing-nav.epub"
Create-EpubFixture -SourceDir $InvalidSrc -OutEpub $InvalidEpub
Write-Host "Created invalid fixture: $InvalidEpub"

Write-Host "`n=== 6. EMPIRICAL CLI & PROTOCOL BEHAVIOR TESTING ==="

function Test-EpubCheckExecution {
    param(
        [string]$JavaBin,
        [string]$EpubPath,
        [string]$ExtraArgs = ""
    )
    $Psi = New-Object System.Diagnostics.ProcessStartInfo
    $Psi.FileName = $JavaBin
    $Psi.Arguments = "-jar `"$EpubCheckJar`" `"$EpubPath`" $ExtraArgs"
    $Psi.RedirectStandardOutput = $true
    $Psi.RedirectStandardError = $true
    $Psi.UseShellExecute = $false
    $Psi.CreateNoWindow = $true

    $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $Process = [System.Diagnostics.Process]::Start($Psi)
    $Stdout = $Process.StandardOutput.ReadToEnd()
    $Stderr = $Process.StandardError.ReadToEnd()
    $Process.WaitForExit()
    $Stopwatch.Stop()

    return [PSCustomObject]@{
        ExitCode = $Process.ExitCode
        Stdout = $Stdout
        Stderr = $Stderr
        ElapsedMs = $Stopwatch.ElapsedMilliseconds
    }
}

Write-Host "--- 6.1 Testing Full JDK vs. Minimal jlink Runtime on Valid EPUB ---"
$FullValidRes = Test-EpubCheckExecution -JavaBin $FullJavaExe -EpubPath $ValidEpub
Write-Host "Full JDK Valid: ExitCode=$($FullValidRes.ExitCode), Time=$($FullValidRes.ElapsedMs)ms"
Write-Host "Stdout:`n$($FullValidRes.Stdout)"
Write-Host "Stderr:`n$($FullValidRes.Stderr)"

$MinimalValidRes = Test-EpubCheckExecution -JavaBin $MinimalJavaExe -EpubPath $ValidEpub
Write-Host "jlink Minimal Valid: ExitCode=$($MinimalValidRes.ExitCode), Time=$($MinimalValidRes.ElapsedMs)ms"
Write-Host "Stdout:`n$($MinimalValidRes.Stdout)"
Write-Host "Stderr:`n$($MinimalValidRes.Stderr)"

Write-Host "`n--- 6.2 Testing Full JDK vs. Minimal jlink Runtime on Invalid EPUB ---"
$FullInvalidRes = Test-EpubCheckExecution -JavaBin $FullJavaExe -EpubPath $InvalidEpub
Write-Host "Full JDK Invalid: ExitCode=$($FullInvalidRes.ExitCode), Time=$($FullInvalidRes.ElapsedMs)ms"
Write-Host "Stdout:`n$($FullInvalidRes.Stdout)"
Write-Host "Stderr:`n$($FullInvalidRes.Stderr)"

$MinimalInvalidRes = Test-EpubCheckExecution -JavaBin $MinimalJavaExe -EpubPath $InvalidEpub
Write-Host "jlink Minimal Invalid: ExitCode=$($MinimalInvalidRes.ExitCode), Time=$($MinimalInvalidRes.ElapsedMs)ms"
Write-Host "Stdout:`n$($MinimalInvalidRes.Stdout)"
Write-Host "Stderr:`n$($MinimalInvalidRes.Stderr)"

Write-Host "`n--- 6.3 Testing JSON Output Modes (-j output file and stdout) ---"
$ValidJsonOutFile = Join-Path $SpikeDir "valid-report.json"
$InvalidJsonOutFile = Join-Path $SpikeDir "invalid-report.json"

$JsonValidRes = Test-EpubCheckExecution -JavaBin $MinimalJavaExe -EpubPath $ValidEpub -ExtraArgs "-j `"$ValidJsonOutFile`""
Write-Host "JSON Valid Execution: ExitCode=$($JsonValidRes.ExitCode), Time=$($JsonValidRes.ElapsedMs)ms"
Write-Host "JSON Valid Stdout:`n$($JsonValidRes.Stdout)"
Write-Host "JSON Valid Stderr:`n$($JsonValidRes.Stderr)"
if (Test-Path $ValidJsonOutFile) {
    Write-Host "JSON File Generated Content Preview:`n$((Get-Content $ValidJsonOutFile -Raw) | Select-String -Pattern '.*' | Select-Object -First 20)"
}

$JsonInvalidRes = Test-EpubCheckExecution -JavaBin $MinimalJavaExe -EpubPath $InvalidEpub -ExtraArgs "-j `"$InvalidJsonOutFile`""
Write-Host "JSON Invalid Execution: ExitCode=$($JsonInvalidRes.ExitCode), Time=$($JsonInvalidRes.ElapsedMs)ms"
Write-Host "JSON Invalid Stdout:`n$($JsonInvalidRes.Stdout)"
Write-Host "JSON Invalid Stderr:`n$($JsonInvalidRes.Stderr)"
if (Test-Path $InvalidJsonOutFile) {
    Write-Host "JSON Invalid File Generated Content Preview:`n$((Get-Content $InvalidJsonOutFile -Raw) | Select-String -Pattern '.*' | Select-Object -First 30)"
}

Write-Host "`n=== 7. BENCHMARKING REPEATED STARTUP TIMES (5 iterations) ==="
$FullTimes = @()
$MinimalTimes = @()

1..5 | ForEach-Object {
    $r1 = Test-EpubCheckExecution -JavaBin $FullJavaExe -EpubPath $ValidEpub
    $FullTimes += $r1.ElapsedMs
    $r2 = Test-EpubCheckExecution -JavaBin $MinimalJavaExe -EpubPath $ValidEpub
    $MinimalTimes += $r2.ElapsedMs
}

$AvgFull = [math]::Round(($FullTimes | Measure-Object -Average).Average, 1)
$AvgMinimal = [math]::Round(($MinimalTimes | Measure-Object -Average).Average, 1)
Write-Host "Full JDK Latencies (ms): $($FullTimes -join ', ') (Avg: $AvgFull ms)"
Write-Host "jlink Minimal Latencies (ms): $($MinimalTimes -join ', ') (Avg: $AvgMinimal ms)"

Write-Host "`n=== 8. SUMMARY MEASUREMENT OBJECT ==="
$Summary = [PSCustomObject]@{
    EpubCheckVersion = "5.3.0"
    EpubCheckZipSize = $EpubCheckZipSize
    EpubCheckDirSize = $EpubCheckDirSize
    EpubCheckSha256 = $EpubCheckHash
    TemurinVersion = "21 LTS (Hotspot)"
    TemurinZipSize = $TemurinZipSize
    TemurinSha256 = $TemurinHash
    FullJdkSize = $FullJdkSize
    JlinkMinimalSize = $MinimalRuntimeSize
    SizeReductionPercent = [math]::Round((1 - ($MinimalRuntimeSize / $FullJdkSize)) * 100, 1)
    RequiredModules = $FinalModules
    AvgFullStartupMs = $AvgFull
    AvgMinimalStartupMs = $AvgMinimal
    ValidExitCode = $MinimalValidRes.ExitCode
    InvalidExitCode = $MinimalInvalidRes.ExitCode
}

$SummaryJson = $Summary | ConvertTo-Json -Depth 4
Set-Content (Join-Path $SpikeDir "measurements.json") $SummaryJson
Write-Host $SummaryJson
