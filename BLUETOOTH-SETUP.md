# 🔵 Configuração de Dispositivos Bluetooth IoMT

## 📱 Dispositivos Suportados

### ✅ Balança Xiaomi Mi Body Composition Scale 2
- **Modelo**: XMTZC05HM
- **Protocolo**: Bluetooth Low Energy (BLE) 5.0
- **Medições**: Peso corporal, composição corporal (IMC, gordura, músculo, etc)
- **Precisão**: 0.05 kg
- **Status**: ✅ Implementado e pronto para uso

### Outros dispositivos:
- ✅ Oxímetro de Pulso (GATT Pulse Oximeter Profile)
- ✅ Termômetro Digital (GATT Health Thermometer Profile)
- ✅ Monitor de Pressão (GATT Blood Pressure Profile)

---

## 🚀 Como Conectar a Balança Xiaomi

### Pré-requisitos
1. **Navegador**: Chrome, Edge ou Opera (Web Bluetooth API)
2. **Conexão**: HTTPS obrigatório (já configurado em telecuidar.com.br)
3. **Permissões**: Permitir acesso Bluetooth quando solicitado
4. **Balança**: Pilhas carregadas, dentro do alcance (2-10m)

### Passo a Passo

#### 1️⃣ Preparar a Balança
```
1. Retire a película protetora se for nova
2. Insira 4 pilhas AAA
3. Aguarde alguns segundos
4. A balança deve mostrar "0.0 kg" no display
5. NÃO suba na balança ainda
```

#### 2️⃣ Acessar a Teleconsulta
```
1. Entre em uma teleconsulta ativa
2. Na barra lateral direita, clique em "Dispositivos Médicos"
3. Você verá 4 cards de dispositivos:
   - Oxímetro
   - Termômetro
   - Balança ← Este aqui!
   - Pressão Arterial
```

#### 3️⃣ Conectar via Bluetooth
```
1. Clique no botão "Conectar" no card da Balança
2. Aparecerá uma janela do navegador com dispositivos Bluetooth
3. Procure por:
   - "MIBCS" ou
   - "MI_SCALE" ou
   - "Xiaomi" ou
   - Nome similar começando com "MI"
4. Selecione o dispositivo
5. Clique em "Parear"
6. Aguarde 2-5 segundos
7. ✅ Status mudará para "Conectado"
```

#### 4️⃣ Realizar a Medição
```
1. Certifique-se de que o card mostra "Conectado"
2. Suba na balança descalço
3. Fique parado até ouvir um "beep"
4. O peso aparecerá automaticamente na interface:
   - Card "Leituras em Tempo Real"
   - Valor: "XX.X kg"
5. Pode descer da balança
```

---

## 🔍 Logs de Debug (Console do Navegador)

Pressione **F12** para abrir o DevTools e veja os logs:

### Logs esperados (sucesso):
```
[BluetoothDevices] Buscando scale...
[BluetoothDevices] Conectando a MIBCS...
[BluetoothDevices] Xiaomi Mi Scale 2 detectada
[BluetoothDevices] ✓ Balança Xiaomi conectada e monitorando
[BluetoothDevices] Aguardando estabilização... 75.3 kg
[BluetoothDevices] Aguardando estabilização... 75.4 kg
[BluetoothDevices] ✓ Peso estabilizado: 75.4 kg
```

### Se aparecer "Xiaomi protocol failed":
```
[BluetoothDevices] Xiaomi protocol failed, trying standard GATT...
[BluetoothDevices] Balança GATT padrão detectada
```
⚠️ **Significa que detectou uma balança genérica, não a Xiaomi**

---

## 🔧 Troubleshooting

### Problema: Balança não aparece na lista
**Causas possíveis:**
- Pilhas fracas → Troque as pilhas
- Balança em standby → Toque no display para ativar
- Bluetooth do PC/notebook desligado → Ative nas configurações
- Muito longe → Aproxime a balança (máx. 5m)

**Solução:**
```bash
# Verificar se Bluetooth está ativo (Linux)
bluetoothctl power on
bluetoothctl scan on

# Windows: Settings > Devices > Bluetooth & other devices
```

### Problema: "Web Bluetooth não disponível"
**Causas:**
- Navegador não suportado (Firefox, Safari)
- Acesso via HTTP (não HTTPS)
- Extensões bloqueando (AdBlock, Privacy Badger)

**Solução:**
1. Use Chrome ou Edge
2. Acesse via HTTPS: https://telecuidar.com.br
3. Desative extensões temporariamente

### Problema: Conecta mas não lê peso
**Diagnóstico:**
```javascript
// No console (F12), digite:
navigator.bluetooth.getAvailability().then(available => {
  console.log('Bluetooth available:', available);
});
```

**Solução:**
1. Desconecte e reconecte
2. Reinicie o navegador
3. Verifique se a balança está no modo de emparelhamento
4. Tente em outro navegador

### Problema: Peso aparece errado
**Verificações:**
- Unidade: Sistema está configurado para kg
- Balança deve estar em superfície plana e firme
- Não usar tapete ou piso macio
- Aguardar estabilização completa (beep)

---

## 📊 Dados Capturados

### Xiaomi Mi Body Composition Scale 2
```typescript
{
  weight: 75.4,              // kg (sempre em kg)
  timestamp: "2026-01-07T20:15:30Z",
  deviceId: "xiaomi-scale-abc123",
  
  // Futura implementação (requer altura/idade/sexo do paciente):
  bodyFat: 18.5,            // % gordura corporal
  muscleMass: 58.2,         // kg massa muscular
  boneMass: 3.1,            // kg massa óssea
  waterPercentage: 62.3,    // % água
  visceralFat: 8,           // nível (1-59)
  bmr: 1685,                // kcal metabolismo basal
  bmi: 24.1                 // IMC calculado
}
```

### Sincronização com Backend
Os dados são automaticamente enviados via SignalR para:
1. **Prontuário do paciente**
2. **Histórico da consulta**
3. **Dashboard de monitoramento**

---

## 🔐 Segurança e Privacidade

### Dados Locais
- ✅ Conexão Bluetooth é ponto-a-ponto (dispositivo ↔ navegador)
- ✅ Nenhum dado trafega por servidores Xiaomi
- ✅ App Mi Fit NÃO é necessário

### Transmissão
- ✅ HTTPS obrigatório (TLS 1.3)
- ✅ SignalR com autenticação JWT
- ✅ Dados criptografados em trânsito

### Armazenamento
- ✅ Backend PostgreSQL com criptografia
- ✅ Backup diário automático
- ✅ Logs de auditoria (LGPD compliance)

---

## 📱 Compatibilidade

### Navegadores Desktop
| Navegador | Versão | Status |
|-----------|--------|--------|
| Chrome | ≥ 56 | ✅ Suportado |
| Edge | ≥ 79 | ✅ Suportado |
| Opera | ≥ 43 | ✅ Suportado |
| Firefox | Qualquer | ❌ Não suportado |
| Safari | Qualquer | ❌ Não suportado |

### Sistemas Operacionais
| OS | Versão | Status |
|----|--------|--------|
| Windows | 10+ | ✅ Suportado |
| macOS | 10.15+ | ✅ Suportado |
| Linux | Ubuntu 18+ | ✅ Suportado |
| ChromeOS | Qualquer | ✅ Suportado |

### Mobile
| Plataforma | Status |
|------------|--------|
| Android Chrome | ✅ Suportado (Android 6+) |
| iOS Safari | ❌ Não suportado |
| iOS Chrome | ❌ Não suportado (usa WebKit) |

---

## 🆘 Suporte

### Contato Técnico
- **Email**: suporte@telecuidar.com.br
- **Logs**: Sempre envie o console (F12) em caso de erro
- **Print**: Tire screenshot da tela de conexão

### Informações Úteis para Suporte
```
Navegador: Chrome 120.0.6099.109
OS: Windows 11
Dispositivo: Xiaomi Mi Body Composition Scale 2
Serial da balança: (encontrar na parte de baixo)
Erro: [copiar mensagem do console]
```

---

## 🔄 Próximos Passos

### Em Desenvolvimento
1. **Composição Corporal Completa**
   - Requer altura, idade, sexo do paciente
   - Algoritmos Xiaomi de análise de impedância
   - Gráficos de evolução temporal

2. **Múltiplos Dispositivos Simultâneos**
   - Oxímetro + Balança + Termômetro ao mesmo tempo
   - Dashboard unificado de sinais vitais

3. **Histórico e Tendências**
   - Gráficos de peso ao longo das consultas
   - Alertas de variações significativas
   - Exportação para PDF

### Como Contribuir
```bash
# Testar novos dispositivos BLE
cd /opt/telecuidar/frontend
# Editar: src/app/core/services/bluetooth-devices.service.ts
# Adicionar novos GATT_SERVICES
```

---

**Última atualização**: 07 de Janeiro de 2026  
**Versão do Sistema**: 2.0.0  
**Autor**: TeleCuidar DevTeam
