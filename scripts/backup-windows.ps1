# Backup consistente do PostgreSQL Quali 17 em Docker, com pg_dump custom.
# Executar na raiz do projeto usando PowerShell 7 ou Windows PowerShell 5.1.
# Nunca envie backup, .env, CPFs ou imagens privadas ao GitHub.
param(
  [string]$Destination = "backups",
  [string]$Container = ""
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$folder = Join-Path (Get-Location) $Destination
New-Item -ItemType Directory -Force -Path $folder | Out-Null
# O Docker Desktop pode exibir o projeto quali-bispo em outro contexto de Compose.
# Aceita seleção explícita por nome/ID e faz verificação antes de gerar o dump.
if ([string]::IsNullOrWhiteSpace($Container)) {
  $composeContainers = @(& docker compose -f compose.yaml ps -q postgres 2>$null | Where-Object { $_ })
  if ($LASTEXITCODE -eq 0 -and $composeContainers.Count -eq 1) {
    $Container = [string]$composeContainers[0]
  } else {
    $matching = @(& docker ps --filter "label=com.docker.compose.project=quali-bispo" --filter "label=com.docker.compose.service=postgres" --format "{{.ID}}" | Where-Object { $_ })
    if ($LASTEXITCODE -eq 0 -and $matching.Count -eq 1) {
      $Container = [string]$matching[0]
    }
  }
}
if ([string]::IsNullOrWhiteSpace($Container)) {
  throw "Não foi possível identificar o PostgreSQL Quali com segurança. Rode: docker ps --format '{{.Names}} | {{.Ports}}' e repita com -Container NOME_COMPLETO."
}
$Container = $Container.Trim()
$running = (& docker inspect -f "{{.State.Running}}" $Container 2>$null)
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
  throw "O contêiner '$Container' não foi encontrado ou não está rodando."
}
& docker exec $Container pg_isready -U quali -d quali | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "O banco quali não está pronto no contêiner '$Container'. Confirme se selecionou o PostgreSQL correto."
}
# Evitar literais SQL com aspas na linha de comando do PowerShell 5.1:
# a passagem de argumentos nativos pode remover aspas e causar falso negativo.
# O metacomando psql consulta o catálogo sem aspas SQL e retorna uma linha por tabela.
$tables = @(& docker exec $Container psql -U quali -d quali -A -t -c "\\dt public.*")
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao listar tabelas do banco quali no contêiner '$Container'."
}
$found = @($tables | Where-Object { $_ -match '^public\\|FinanceCustomer\\|' })
if ($found.Count -ne 1) {
  Write-Host "Tabelas encontradas em public:" -ForegroundColor Yellow
  $tables | ForEach-Object { Write-Host "  $_" }
  throw "FinanceCustomer não foi encontrada em public. Confirme se o .env aponta para este mesmo banco. Não será feito backup de uma base possivelmente errada."
}
$filename = "quali-$stamp.dump"
$remote = "/tmp/$filename"
$destinationPath = Join-Path $folder $filename
try {
  & docker exec $Container pg_dump -U quali -d quali --format=custom --no-owner --no-acl "--file=$remote"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou; backup não foi confirmado." }
  & docker exec $Container pg_restore --list $remote | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "pg_restore não reconheceu o arquivo gerado." }
  & docker cp "${Container}:$remote" $destinationPath
  if ($LASTEXITCODE -ne 0) { throw "Falha ao copiar o dump para o Windows." }
  $file = Get-Item $destinationPath
  if ($file.Length -lt 100) { throw "Dump inesperadamente pequeno. Não utilize este backup." }
  $sha = (Get-FileHash -Path $destinationPath -Algorithm SHA256).Hash.ToLowerInvariant()
  # O nome relativo torna o arquivo de checksum utilizável por sha256sum -c no Linux.
  [System.IO.File]::WriteAllText("$destinationPath.sha256", "$sha  $filename`n", [System.Text.Encoding]::ASCII)
  Write-Host "BACKUP OK: $destinationPath ($($file.Length) bytes)" -ForegroundColor Green
  Write-Host "SHA256: $sha"
} finally {
  & docker exec $Container rm -f $remote | Out-Null
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
