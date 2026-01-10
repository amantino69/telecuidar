# 🔄 Instruções de Restauração - TeleCuidar

## Versão: Ausculta Digital Funcionando
**Data:** 07/01/2026
**Tag Git:** `v1.0.0-ausculta-funcionando`
**Branch:** `iomt-backup-20260107`

---

## 📋 3 FORMAS DE RESTAURAR

### FORMA 1: Via Git (Recomendado se tiver o repositório)

```bash
# Se já tem o repositório clonado:
cd /opt/telecuidar
git fetch --all --tags
git checkout v1.0.0-ausculta-funcionando

# OU para branch:
git checkout iomt-backup-20260107

# Rebuild dos containers:
docker compose build --no-cache
docker compose up -d
```

### FORMA 2: Via GitHub

```bash
# Clone do repositório
git clone https://github.com/guilhermevieirao/telecuidar.git
cd telecuidar
git checkout v1.0.0-ausculta-funcionando

# Copie o arquivo .env de produção
cp .env.example .env
# Edite o .env com suas configurações

# Build e start
docker compose build
docker compose up -d
```

### FORMA 3: Via arquivo ZIP

```bash
# Copie o arquivo ZIP para o servidor
scp telecuidar-backup-ausculta-funcionando-20260107.zip user@servidor:/opt/

# No servidor:
cd /opt
unzip telecuidar-backup-ausculta-funcionando-20260107.zip

# Entre na pasta e configure
cd telecuidar
cp .env.example .env
# Edite o .env com suas configurações

# Instale dependências e faça build
cd frontend && npm install && cd ..
docker compose build
docker compose up -d
```

---

## 📁 ARQUIVOS IMPORTANTES

### Configuração (.env)
O arquivo `.env` contém todas as configurações sensíveis:
- Credenciais do banco de dados
- Chaves JWT
- Configuração do Jitsi
- URLs do sistema

**⚠️ IMPORTANTE:** O arquivo `.env` NÃO está no backup por segurança.
Use `.env.example` como base e configure suas credenciais.

### Estrutura do Projeto
```
telecuidar/
├── backend/           # API .NET
├── frontend/          # Angular App
├── docker/            # Nginx configs
├── jitsi-config/      # Jitsi customizações
├── docker-compose.yml # Produção
└── .env               # Configurações (criar)
```

---

## 🚀 COMANDOS ÚTEIS

```bash
# Ver containers rodando
docker compose ps

# Ver logs
docker compose logs -f frontend
docker compose logs -f backend

# Rebuild específico
docker compose build frontend --no-cache
docker compose up -d frontend

# Parar tudo
docker compose down

# Limpar e recomeçar
docker compose down -v
docker system prune -af
docker compose build --no-cache
docker compose up -d
```

---

## ✅ FUNCIONALIDADES DESTA VERSÃO

- [x] Teleconsulta com Jitsi (videochamada)
- [x] **Ausculta Digital em tempo real**
- [x] Streaming de áudio paciente → médico
- [x] Visualização de waveform
- [x] Seleção de área (cardíaca, pulmonar, abdominal)
- [x] Hub SignalR para dispositivos IoMT
- [x] Painel de dispositivos médicos

---

## 📞 SUPORTE

Se precisar de ajuda, os arquivos principais estão em:
- `frontend/src/app/pages/user/shared/teleconsultation/tabs/medical-devices-tab/`
- `frontend/src/app/core/services/medical-*`
- `backend/WebAPI/Hubs/MedicalDevicesHub.cs`
