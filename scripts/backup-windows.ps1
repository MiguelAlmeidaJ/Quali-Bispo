# Backup consistente do PostgreSQL Quali 17 em Docker, com pg_dump custom.
# Executar na raiz do projeto usando PowerShell 7 ou Windows PowerShell 5.1.
# Nunca envie backup, .env, CPFs ou imagens privadas ao GitHub.
param(
  [string]$Destination = "backups"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$folder = Join-Path (Get-Location) $Destination
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$container = (& docker compose -f compose.yaml ps -q postgres | Select-Object -First 1).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($container)) {
  throw "PostgreSQL Docker não está rodando. Rode 'docker compose up -d postgres' antes."
}
$filename = "quali-$stamp.dump"
$remote = "/tmp/$filename"
$destinationPath = Join-Path $folder $filename
try {
  & docker exec $container pg_dump -U quali -d quali --format=custom --no-owner --no-acl "--file=$remote"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou; backup não foi confirmado." }
  & docker exec $container pg_restore --list $remote | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "pg_restore não reconheceu o arquivo gerado." }
  & docker cp "${container}:$remote" $destinationPath
  if ($LASTEXITCODE -ne 0) { throw "Falha ao copiar o dump para o Windows." }
  $file = Get-Item $destinationPath
  if ($file.Length -lt 100) { throw "Dump inesperadamente pequeno. Não utilize este backup." }
  $sha = (Get-FileHash -Path $destinationPath -Algorithm SHA256).Hash.ToLowerInvariant()
  # O nome relativo torna o arquivo de checksum utilizável por sha256sum -c no Linux.
  [System.IO.File]::WriteAllText("$destinationPath.sha256", "$sha  $filename`n", [System.Text.Encoding]::ASCII)
  Write-Host "BACKUP OK: $destinationPath ($($file.Length) bytes)" -ForegroundColor Green
  Write-Host "SHA256: $sha"
} finally {
  & docker exec $container rm -f $remote | Out-Null
}
$brandingPath = "apps/api/storage/branding"
if (Test-Path $brandingPath) {
  $brandZip = Join-Path $folder "branding-$stamp.zip"
  Compress-Archive -Path $brandingPath -DestinationPath $brandZip -Force
  Write-Host "IMAGENS DE MARCA: $brandZip"
}
Write-Host ""
Write-Warning "O .env contém segredos e não foi copiado automaticamente. Guarde CPF_HASH_KEY, DATABASE_URL e demais variáveis em um cofre/arquivo seguro separado."
Write-Warning "O dump contém dados pessoais reais. Restrinja acesso, transporte via SSH/SCP e não faça commit no Git."
