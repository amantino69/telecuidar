# ========================================
# TeleCuidar - Script de Reset do Banco para POC
# ========================================
# Este script remove o banco existente e força a recriação
# com todos os dados do seeder POC (usuários, agendas, consultas)
#
# Uso: .\reset-banco-poc.ps1
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TeleCuidar - Reset do Banco para POC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o backend está rodando
$backendProcess = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match "WebAPI" -or $_.CommandLine -match "WebAPI" }
if ($backendProcess) {
    Write-Host "[!] Backend está rodando. Parando..." -ForegroundColor Yellow
    # Tentar parar graciosamente
    Stop-Process -Name "dotnet" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Caminhos do banco
$dbPath = "backend\WebAPI\telecuidar.db"
$dbShmPath = "backend\WebAPI\telecuidar.db-shm"
$dbWalPath = "backend\WebAPI\telecuidar.db-wal"

# Remover arquivos do banco
Write-Host ""
Write-Host "[1/3] Removendo banco de dados existente..." -ForegroundColor Yellow

if (Test-Path $dbPath) {
    Remove-Item $dbPath -Force
    Write-Host "  - Removido: $dbPath" -ForegroundColor Green
} else {
    Write-Host "  - Não encontrado: $dbPath" -ForegroundColor Gray
}

if (Test-Path $dbShmPath) {
    Remove-Item $dbShmPath -Force
    Write-Host "  - Removido: $dbShmPath" -ForegroundColor Green
}

if (Test-Path $dbWalPath) {
    Remove-Item $dbWalPath -Force
    Write-Host "  - Removido: $dbWalPath" -ForegroundColor Green
}

# Garantir que POC_SEED_ENABLED está true no .env
Write-Host ""
Write-Host "[2/3] Verificando configuração do .env..." -ForegroundColor Yellow

$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -match "POC_SEED_ENABLED=false") {
        $envContent = $envContent -replace "POC_SEED_ENABLED=false", "POC_SEED_ENABLED=true"
        Set-Content $envPath $envContent -NoNewline
        Write-Host "  - POC_SEED_ENABLED alterado para true" -ForegroundColor Green
    } elseif ($envContent -notmatch "POC_SEED_ENABLED") {
        Add-Content $envPath "`nPOC_SEED_ENABLED=true"
        Write-Host "  - POC_SEED_ENABLED adicionado como true" -ForegroundColor Green
    } else {
        Write-Host "  - POC_SEED_ENABLED já está true" -ForegroundColor Green
    }
} else {
    Write-Host "  - AVISO: Arquivo .env não encontrado!" -ForegroundColor Red
}

# Iniciar o backend para recriar o banco
Write-Host ""
Write-Host "[3/3] Iniciando backend para recriar banco com seeder POC..." -ForegroundColor Yellow
Write-Host ""

# Executar dotnet run
Set-Location backend\WebAPI
Write-Host "Executando: dotnet run" -ForegroundColor Gray
Write-Host ""

# Iniciar o processo
$process = Start-Process -FilePath "dotnet" -ArgumentList "run" -PassThru -NoNewWindow

# Aguardar até o seeder terminar (procurar pela mensagem no console)
Write-Host "Aguardando inicialização e seeder..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Reset concluído!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "O backend está rodando. Credenciais de acesso:" -ForegroundColor Cyan
Write-Host ""
Write-Host "MEDICOS (senha: 123):" -ForegroundColor Yellow
Write-Host "  med_aj@telecuidar.com - Antonio Jorge (Psiquiatria)"
Write-Host "  med_gt@telecuidar.com - Geraldo Tadeu (Dermatologia)"
Write-Host "  med_do@telecuidar.com - Daniela Ochoa (Pediatria)"
Write-Host "  med_dc@telecuidar.com - Daniel Carrara (Cardiologia)"
Write-Host "  med_ca@telecuidar.com - Claudio Amantino (Neurologia)"
Write-Host ""
Write-Host "ASSISTENTES (senha: 123):" -ForegroundColor Yellow
Write-Host "  enf_aj@telecuidar.com, enf_gt@telecuidar.com, enf_do@telecuidar.com"
Write-Host "  enf_dc@telecuidar.com, enf_ca@telecuidar.com"
Write-Host ""
Write-Host "ADMINISTRADORES (senha: 123):" -ForegroundColor Yellow
Write-Host "  adm_aj@telecuidar.com, adm_gt@telecuidar.com, adm_do@telecuidar.com"
Write-Host "  adm_dc@telecuidar.com, adm_ca@telecuidar.com"
Write-Host ""
Write-Host "PACIENTES (senha: 123):" -ForegroundColor Yellow
Write-Host "  pac_aj@telecuidar.com, pac_gt@telecuidar.com, pac_do@telecuidar.com"
Write-Host "  pac_dc@telecuidar.com, pac_ca@telecuidar.com"
Write-Host ""
Write-Host "Consultas: Fevereiro e Marco 2026 (50 consultas total)"
Write-Host ""
Write-Host "Para parar o backend: Ctrl+C ou feche esta janela"
Write-Host "========================================" -ForegroundColor Cyan

# Voltar ao diretório original
Set-Location ..\..

# Manter o script rodando para ver os logs
Wait-Process -Id $process.Id
