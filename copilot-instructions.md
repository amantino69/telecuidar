# 📋 Instruções para IA - TeleCuidar POC

> **IMPORTANTE**: Este arquivo contém instruções críticas para qualquer IA que trabalhe neste projeto.
> Leia completamente antes de fazer qualquer alteração.

---

## 🔐 Repositório GitHub

### Conta e Repositório CORRETOS
- **Proprietário**: `amantino69`
- **Repositório**: `novocuidar`
- **URL HTTPS**: `https://github.com/amantino69/novocuidar.git`
- **URL com Token**: Use a variável de ambiente `$GITHUB_TOKEN` ou consulte o arquivo `.git/config`

### ⚠️ ATENÇÃO - Repositório ANTIGO (NÃO USAR para desenvolvimento)
- O repositório `guilhermevieirao/telecuidar` é o repositório ORIGINAL
- O script `deploy.sh` clona deste repositório antigo
- **NUNCA** usar este repositório para desenvolvimento da POC

### Configuração do Remote
```bash
# Verificar remotes configurados
git remote -v

# O remote correto deve ser:
# origin ou novocuidar -> https://github.com/amantino69/novocuidar.git

# Se precisar adicionar/corrigir (substitua $GITHUB_TOKEN pelo token real):
git remote set-url origin https://$GITHUB_TOKEN@github.com/amantino69/novocuidar.git

# Ou adicionar como novo remote:
git remote add novocuidar https://$GITHUB_TOKEN@github.com/amantino69/novocuidar.git

# NOTA: O token está configurado no .git/config local
# Para ver: cat .git/config | grep url
```

---

## 🐳 Containers Docker

### Arquitetura de Containers
```
┌─────────────────────────────────────────────────────────────┐
│                      telecuidar-nginx                        │
│                    (Porta 80, 443)                           │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
         ┌────────────▼────────┐ ┌───────▼────────────┐
         │ telecuidar-frontend │ │ telecuidar-backend │
         │    (Porta 4000)     │ │   (Porta 5000)     │
         └─────────────────────┘ └────────┬───────────┘
                                          │
                               ┌──────────▼──────────┐
                               │  SQLite Database    │
                               │ /app/data/telecuidar.db
                               └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Jitsi Meet (Videoconferência)             │
├─────────────────┬─────────────────┬─────────────────────────┤
│ telecuidar-     │ telecuidar-     │ telecuidar-jitsi-web    │
│ prosody         │ jicofo          │ (Porta 8443)            │
├─────────────────┼─────────────────┴─────────────────────────┤
│ telecuidar-jvb  │ (Portas 8080, 10000/udp)                  │
└─────────────────┴───────────────────────────────────────────┘
```

### Comandos Essenciais
```bash
# Ver status de todos os containers
docker compose ps

# Ver logs de um container específico
docker logs telecuidar-backend -f --tail=50
docker logs telecuidar-frontend -f --tail=50

# Reiniciar um container
docker compose restart backend
docker compose restart frontend

# Parar todos os containers
docker compose down

# Iniciar todos os containers
docker compose up -d

# Reconstruir um container (após mudanças no código)
docker compose build backend --no-cache
docker compose build frontend --no-cache
```

### Volumes Importantes
```bash
# Listar volumes
docker volume ls | grep telecuidar

# Volumes críticos:
# - telecuidar-backend-data     -> Banco de dados SQLite
# - telecuidar-backend-uploads  -> Arquivos enviados
# - telecuidar-backend-avatars  -> Fotos de perfil
# - telecuidar-backend-logs     -> Logs da aplicação
```

---

## 🗄️ Banco de Dados POC

### Localização
- **No container**: `/app/data/telecuidar.db`
- **No código fonte**: `/opt/telecuidar/backend/WebAPI/telecuidar.db` (BACKUP!)

### ⚠️ CRÍTICO - Preservar o Banco POC
O banco POC contém dados preparados para apresentação. **NUNCA** remover os volumes sem backup!

### Backup do Banco POC
```bash
# Copiar banco do container para local
docker cp telecuidar-backend:/app/data/telecuidar.db /opt/telecuidar/backend/WebAPI/telecuidar.db

# Verificar conteúdo
sqlite3 /opt/telecuidar/backend/WebAPI/telecuidar.db "SELECT Email FROM Users WHERE Email LIKE '%@telecuidar.com';"
```

### Restaurar o Banco POC
```bash
# Se o banco foi corrompido/perdido:
docker compose stop backend
docker cp /opt/telecuidar/backend/WebAPI/telecuidar.db telecuidar-backend:/app/data/telecuidar.db

# Corrigir permissões
docker run --rm -v telecuidar-backend-data:/data alpine sh -c "chmod 666 /data/telecuidar.db"

docker compose start backend
```

### Usuários POC

#### Médicos (Role: PROFESSIONAL = 1)
| Email | Nome | Especialidade | Senha |
|-------|------|---------------|-------|
| med_gt@telecuidar.com | Geraldo Tadeu | Clínica Geral | 123 |
| med_aj@telecuidar.com | Antônio Jorge | Psiquiatria | 123 |

#### Assistentes/Enfermeiras (Role: ASSISTANT = 3)
| Email | Nome | Senha |
|-------|------|-------|
| enf_do@telecuidar.com | Daniela Ochoa | 123 |

#### Administradores (Role: ADMIN = 2)
| Email | Nome | Senha |
|-------|------|-------|
| adm_ca@telecuidar.com | Cláudio Amantino | 123 |

#### Pacientes (Role: PATIENT = 0)
| Email | Nome | Sexo | Nascimento | Idade |
|-------|------|------|------------|-------|
| pac_maria@telecuidar.com | Maria Silva | F | 1952-11-20 | 73 anos |
| pac_dc@telecuidar.com | Daniel Carrara | M | 1985-06-10 | 40 anos |
| pac_joao@telecuidar.com | João Santos | M | 1995-02-28 | 30 anos |
| pac_ana@telecuidar.com | Ana Oliveira | F | 1990-08-05 | 35 anos |
| pac_lucia@telecuidar.com | Lúcia Ferreira | F | 1965-04-30 | 60 anos |
| pac_pedro@telecuidar.com | Pedro Costa | M | 1978-12-12 | 47 anos |

### Consultas POC
- **Total**: ~70 consultas
- **Período**: Dezembro/2025 a Março/2026
- **Status**: Agendadas e Realizadas

---

## 📝 POP - Procedimento Operacional Padrão

### 1️⃣ Antes de Iniciar Qualquer Trabalho
```bash
cd /opt/telecuidar

# Verificar branch atual
git branch

# Verificar se há mudanças não commitadas
git status

# Verificar remote configurado
git remote -v
# DEVE mostrar: novocuidar ou origin -> github.com/amantino69/novocuidar.git

# Atualizar código do repositório
git pull origin main
# ou
git pull novocuidar main
```

### 2️⃣ Após Fazer Alterações no Código

#### Passo 1: Verificar Mudanças
```bash
git status
git diff --name-only
```

#### Passo 2: Testar Localmente (Frontend)
```bash
cd /opt/telecuidar/frontend
npm install --legacy-peer-deps  # Se necessário
npx ng build --configuration=production

# Verificar se não há erros de compilação
```

#### Passo 3: Commit
```bash
cd /opt/telecuidar
git add .
git commit -m "Descrição clara da alteração"

# Exemplos de boas mensagens:
# feat: Adiciona exibição de Sexo e Idade na tela de sinais vitais
# fix: Corrige erro de conexão SignalR
# refactor: Reorganiza componentes de teleconsulta
```

#### Passo 4: Push
```bash
git push origin main
# ou
git push novocuidar main

# Se der erro de autenticação, verifique o token no .git/config
# O token já está configurado no remote local
```

### 3️⃣ Deploy em Produção

#### ⚠️ NÃO USAR deploy.sh para atualização!
O script `deploy.sh` clona o repositório ANTIGO e **apaga todo o trabalho local**.

#### Procedimento Correto de Deploy:

```bash
cd /opt/telecuidar

# 1. BACKUP do banco de dados ANTES de qualquer coisa
docker cp telecuidar-backend:/app/data/telecuidar.db /opt/telecuidar/backend/WebAPI/telecuidar.db
echo "Backup do banco realizado em $(date)" >> /opt/telecuidar/backups/backup.log

# 2. Reconstruir o Frontend
docker compose build frontend --no-cache

# 3. Reconstruir o Backend (se houve mudanças)
docker compose build backend --no-cache

# 4. Reiniciar os containers
docker compose up -d frontend backend

# 5. Aguardar containers ficarem healthy
sleep 15
docker compose ps

# 6. Verificar se está funcionando
curl -s https://www.telecuidar.com.br/api/health | jq '.'

# 7. Verificar logs por erros
docker logs telecuidar-backend --tail=20
docker logs telecuidar-frontend --tail=20
```

### 4️⃣ Rollback em Caso de Problema

```bash
# Se algo der errado após deploy:

# 1. Restaurar banco POC
docker compose stop backend
docker cp /opt/telecuidar/backend/WebAPI/telecuidar.db telecuidar-backend:/app/data/telecuidar.db
docker run --rm -v telecuidar-backend-data:/data alpine sh -c "chmod 666 /data/telecuidar.db"
docker compose start backend

# 2. Se precisar voltar código:
git log --oneline -5  # Ver últimos commits
git revert HEAD       # Reverter último commit
git push origin main
```

---

## 🔧 Variáveis de Ambiente Importantes

### Arquivo .env
```bash
# POC Seeder - Manter TRUE para ambiente de POC
POC_SEED_ENABLED=true

# Outras configurações importantes no .env:
# - JWT_SECRET
# - DATABASE_PATH=/app/data/telecuidar.db
# - JITSI_APP_ID
# - JITSI_APP_SECRET
```

---

## ❌ O QUE NÃO FAZER

1. **NÃO executar `./deploy.sh`** - Ele clona o repositório antigo e apaga tudo

2. **NÃO remover volumes Docker** sem fazer backup do banco:
   ```bash
   # ERRADO - NUNCA fazer isso sem backup:
   docker volume rm telecuidar-backend-data
   ```

3. **NÃO fazer push para o repositório errado**:
   ```bash
   # ERRADO:
   git push origin main  # Se origin for guilhermevieirao/telecuidar
   ```

4. **NÃO alterar o banco POC** sem necessidade - Os dados foram preparados para apresentação

5. **NÃO usar npm install sem --legacy-peer-deps** no frontend

---

## ✅ Checklist Pré-Deploy

- [ ] Backup do banco de dados feito
- [ ] Código testado localmente (`ng build --configuration=production`)
- [ ] Commit feito com mensagem descritiva
- [ ] Push para `amantino69/novocuidar`
- [ ] Containers reconstruídos (`docker compose build`)
- [ ] Containers reiniciados (`docker compose up -d`)
- [ ] Health check passando
- [ ] Teste manual no navegador

---

## 📞 Informações de Acesso

- **URL Produção**: https://www.telecuidar.com.br
- **URL Jitsi**: https://meet.telecuidar.com.br
- **API**: https://www.telecuidar.com.br/api

---

## 📅 Última Atualização
- **Data**: 25/01/2026
- **Autor**: IA Assistant
- **Motivo**: Documentação de procedimentos após incidentes de deploy

