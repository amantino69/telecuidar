# TeleCuidar - Guia Rápido POC

## 🚀 Reset do Banco para POC

Para resetar o banco ao estado inicial da POC, execute:

```powershell
# Opção 1: Script automático
.\reset-banco-poc.ps1

# Opção 2: Manual
# 1. Pare o backend (Ctrl+C)
# 2. Delete o banco
Remove-Item backend\WebAPI\telecuidar.db -Force
# 3. Reinicie o backend
dotnet run --project backend\WebAPI\WebAPI.csproj
```

---

## 👥 Credenciais de Acesso (Senha: `123`)

### Médicos (PROFESSIONAL)
| Email | Nome | Especialidade |
|-------|------|---------------|
| med_aj@telecuidar.com | Antônio Jorge | Psiquiatria |
| med_gt@telecuidar.com | Geraldo Tadeu | Dermatologia |
| med_do@telecuidar.com | Daniela Ochoa | Pediatria |
| med_dc@telecuidar.com | Daniel Carrara | Cardiologia |
| med_ca@telecuidar.com | Cláudio Amantino | Neurologia |

### Assistentes (ASSISTANT)
| Email | Nome |
|-------|------|
| enf_aj@telecuidar.com | Antônio Jorge |
| enf_gt@telecuidar.com | Geraldo Tadeu |
| enf_do@telecuidar.com | Daniela Ochoa |
| enf_dc@telecuidar.com | Daniel Carrara |
| enf_ca@telecuidar.com | Cláudio Amantino |

### Administradores (ADMIN)
| Email | Nome |
|-------|------|
| adm_aj@telecuidar.com | Antônio Jorge |
| adm_gt@telecuidar.com | Geraldo Tadeu |
| adm_do@telecuidar.com | Daniela Ochoa |
| adm_dc@telecuidar.com | Daniel Carrara |
| adm_ca@telecuidar.com | Cláudio Amantino |

### Pacientes (PATIENT)
| Email | Nome |
|-------|------|
| pac_aj@telecuidar.com | Antônio Jorge |
| pac_gt@telecuidar.com | Geraldo Tadeu |
| pac_do@telecuidar.com | Daniela Ochoa |
| pac_dc@telecuidar.com | Daniel Carrara |
| pac_ca@telecuidar.com | Cláudio Amantino |

---

## 📅 Dados Criados

- **5 Especialidades**: Psiquiatria, Dermatologia, Pediatria, Cardiologia, Neurologia
- **5 Agendas**: Uma para cada médico (Fev-Mar 2026, Seg-Sex, 08h-18h)
- **50 Consultas**: 10 por médico, distribuídas entre Fevereiro e Março de 2026
- **20 Usuários**: 5 de cada perfil (médico, assistente, admin, paciente)

---

## 🎯 Roteiro Sugerido para POC

### 1. Demonstrar Perfil Paciente
- Login como `pac_aj@telecuidar.com`
- Ver consultas agendadas
- Testar pré-consulta
- Entrar em teleconsulta

### 2. Demonstrar Perfil Médico
- Login como `med_aj@telecuidar.com`
- Ver agenda do dia
- Iniciar teleconsulta
- Preencher prontuário (SOAP, prescrição, atestado)
- Usar IA para resumo

### 3. Demonstrar Perfil Assistente
- Login como `enf_aj@telecuidar.com`
- Agendar consultas para pacientes
- Gerenciar agenda dos médicos

### 4. Demonstrar Perfil Admin
- Login como `adm_aj@telecuidar.com`
- Gerenciar usuários
- Criar especialidades
- Ver relatórios

---

## ⚠️ Observações Importantes

1. **Senha simples**: A senha `123` não atende aos requisitos normais do sistema (8 caracteres, maiúsculas, números, especiais). Funciona apenas porque foi criada diretamente no banco pelo seeder.

2. **Email não validado na POC**: Os usuários já vêm com `EmailVerified = true`, não precisam confirmar email.

3. **Banco local**: O arquivo `telecuidar.db` está no `.gitignore` e não será versionado.

4. **Para produção**: Desative o `POC_SEED_ENABLED` no `.env` e use o seeder padrão.
