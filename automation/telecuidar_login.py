"""
Automação TeleCuidar - Login com Selenium
==========================================
Abre duas instâncias do Chrome:
- Guia normal: login com assistente (assist@assist.com)
- Guia anônima: login com médico (med@med.com)
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


# Configurações
URL_INICIAL = "https://www.telecuidar.com.br/"
TEMPO_ESPERA = 10  # segundos

# Credenciais
ASSIST_EMAIL = "assist@assist.com"
ASSIST_SENHA = "zxcasd12"
MED_EMAIL = "med@med.com"
MED_SENHA = "zxcasd12"

# XPaths
XPATH_BOTAO_ENTRAR_HOME = "/html/body/app-root/app-landing/div/app-header/header/div/div/div/app-button[1]/button"
XPATH_EMAIL = '//*[@id="email"]'
XPATH_SENHA = "/html/body/app-root/app-login/div/div[2]/div/form/div[2]/app-input-password/div/input"
XPATH_BOTAO_ENTRAR_LOGIN = "/html/body/app-root/app-login/div/div[2]/div/form/app-button/button"

# XPaths específicos do Assistente
XPATH_CONSULTORIO_DIGITAL = "/html/body/app-root/app-panel-router/app-assistant-panel/div/section[3]/button[1]/span[1]"
XPATH_TODAS_CONSULTAS = "/html/body/app-root/app-user-layout/div/div/main/app-digital-office/div/div[2]/div[1]/button[2]"

# XPaths específicos do Médico
XPATH_MINHAS_CONSULTAS = "/html/body/app-root/app-panel-router/app-professional-panel/div/section[3]/button[1]"


def criar_driver_normal():
    """Cria uma instância do Chrome em modo normal."""
    options = Options()
    options.add_experimental_option("detach", True)  # Mantém o navegador aberto
    options.add_argument("--start-maximized")
    driver = webdriver.Chrome(options=options)
    return driver


def criar_driver_anonimo():
    """Cria uma instância do Chrome em modo anônimo (incognito)."""
    options = Options()
    options.add_experimental_option("detach", True)  # Mantém o navegador aberto
    options.add_argument("--incognito")
    options.add_argument("--start-maximized")
    driver = webdriver.Chrome(options=options)
    return driver


def esperar_e_clicar(driver, xpath, descricao="elemento"):
    """Espera um elemento estar clicável e clica nele."""
    print(f"  Aguardando {descricao}...")
    elemento = WebDriverWait(driver, TEMPO_ESPERA).until(
        EC.element_to_be_clickable((By.XPATH, xpath))
    )
    elemento.click()
    print(f"  ✓ Clicou em {descricao}")
    time.sleep(1)


def esperar_e_preencher(driver, xpath, texto, descricao="campo"):
    """Espera um elemento estar presente e preenche com texto."""
    print(f"  Preenchendo {descricao}...")
    elemento = WebDriverWait(driver, TEMPO_ESPERA).until(
        EC.presence_of_element_located((By.XPATH, xpath))
    )
    elemento.clear()
    elemento.send_keys(texto)
    print(f"  ✓ Preencheu {descricao}")


def fazer_login(driver, email, senha):
    """Realiza o login no TeleCuidar."""
    print(f"\n📧 Fazendo login com: {email}")
    
    # Acessar página inicial
    driver.get(URL_INICIAL)
    print("  ✓ Página inicial carregada")
    time.sleep(2)
    
    # Clicar no botão ENTRAR da página inicial
    esperar_e_clicar(driver, XPATH_BOTAO_ENTRAR_HOME, "botão ENTRAR (home)")
    time.sleep(2)
    
    # Preencher email
    esperar_e_preencher(driver, XPATH_EMAIL, email, "email")
    
    # Preencher senha
    esperar_e_preencher(driver, XPATH_SENHA, senha, "senha")
    
    # Clicar no botão ENTRAR do login
    esperar_e_clicar(driver, XPATH_BOTAO_ENTRAR_LOGIN, "botão ENTRAR (login)")
    
    print("  ✓ Login realizado com sucesso!")
    time.sleep(3)


def navegar_assistente(driver):
    """Navega até 'Todas as Consultas' para o assistente."""
    print("\n📋 Navegando para Todas as Consultas (Assistente)...")
    
    # Clicar em Consultório Digital
    esperar_e_clicar(driver, XPATH_CONSULTORIO_DIGITAL, "Consultório Digital")
    time.sleep(2)
    
    # Clicar em Todas as Consultas
    esperar_e_clicar(driver, XPATH_TODAS_CONSULTAS, "Todas as Consultas")
    
    print("  ✓ Assistente está em 'Todas as Consultas'")


def navegar_medico(driver):
    """Navega até 'Minhas Consultas' para o médico."""
    print("\n📋 Navegando para Minhas Consultas (Médico)...")
    
    # Clicar em Minhas Consultas
    esperar_e_clicar(driver, XPATH_MINHAS_CONSULTAS, "Minhas Consultas")
    
    print("  ✓ Médico está em 'Minhas Consultas'")


def main():
    """Função principal que executa a automação."""
    print("=" * 60)
    print("🏥 AUTOMAÇÃO TELECUIDAR - LOGIN DUPLO")
    print("=" * 60)
    
    driver_assist = None
    driver_med = None
    
    try:
        # === ASSISTENTE (Guia Normal) ===
        print("\n" + "=" * 40)
        print("👤 ASSISTENTE - Guia Normal")
        print("=" * 40)
        
        driver_assist = criar_driver_normal()
        fazer_login(driver_assist, ASSIST_EMAIL, ASSIST_SENHA)
        navegar_assistente(driver_assist)
        
        # === MÉDICO (Guia Anônima) ===
        print("\n" + "=" * 40)
        print("👨‍⚕️ MÉDICO - Guia Anônima")
        print("=" * 40)
        
        driver_med = criar_driver_anonimo()
        fazer_login(driver_med, MED_EMAIL, MED_SENHA)
        navegar_medico(driver_med)
        
        # === Conclusão ===
        print("\n" + "=" * 60)
        print("✅ AUTOMAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 60)
        print("\n📌 Os navegadores permanecerão abertos.")
        print("   - Guia Normal: Assistente em 'Todas as Consultas'")
        print("   - Guia Anônima: Médico em 'Minhas Consultas'")
        print("\n⚠️  Feche os navegadores manualmente quando terminar.")
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        print("\nVerifique se:")
        print("  1. O Chrome está instalado")
        print("  2. O ChromeDriver está instalado e no PATH")
        print("  3. O site está acessível")
        raise


if __name__ == "__main__":
    main()
