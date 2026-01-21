# Automação TeleCuidar - Login Duplo

Script Python com Selenium para automatizar o login no TeleCuidar com dois usuários simultaneamente.

## Funcionalidades

- **Guia Normal**: Login com assistente (`assist@assist.com`) → Navega até "Todas as Consultas"
- **Guia Anônima**: Login com médico (`med@med.com`) → Navega até "Minhas Consultas"
- Ambos os navegadores permanecem abertos após a execução

## Pré-requisitos

1. **Python 3.8+** instalado
2. **Google Chrome** instalado
3. **ChromeDriver** compatível com sua versão do Chrome

### Instalação do ChromeDriver

O Selenium 4+ gerencia automaticamente o ChromeDriver, mas se precisar instalar manualmente:

```bash
# Via webdriver-manager (recomendado)
pip install webdriver-manager
```

## Instalação

```bash
# Navegar até a pasta
cd automation

# Criar ambiente virtual (opcional, mas recomendado)
python -m venv venv
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt
```

## Execução

```bash
python telecuidar_login.py
```

## Estrutura do Script

```
telecuidar_login.py
├── criar_driver_normal()     # Chrome em modo normal
├── criar_driver_anonimo()    # Chrome em modo incógnito
├── fazer_login()             # Processo de login
├── navegar_assistente()      # Navega até Todas as Consultas
├── navegar_medico()          # Navega até Minhas Consultas
└── main()                    # Orquestra a automação
```

## Configurações

As configurações podem ser alteradas no início do arquivo:

```python
TEMPO_ESPERA = 10  # Tempo de espera em segundos
ASSIST_EMAIL = "assist@assist.com"
ASSIST_SENHA = "zxcasd12"
MED_EMAIL = "med@med.com"
MED_SENHA = "zxcasd12"
```

## Troubleshooting

### Erro: ChromeDriver não encontrado
```bash
pip install webdriver-manager
```

### Erro: Elemento não encontrado
- Verifique se o site está acessível
- Aumente o `TEMPO_ESPERA` no script
- Verifique se os XPaths não mudaram

### Erro: Versão do ChromeDriver incompatível
- Atualize o Chrome para a versão mais recente
- O Selenium 4+ gerencia automaticamente a versão correta
