// Este arquivo é gerado automaticamente pelo script generate-env.js
// NÃO EDITE MANUALMENTE - Edite o arquivo .env na raiz do projeto

// Determina dinamicamente a URL da API baseado no host atual
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Se acessando via IP ou não-localhost, usar o mesmo host para API
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5239/api`;
    }
  }
  return 'http://localhost:5239/api';
};

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  jitsiDomain: 'meet.jit.si',
  jitsiEnabled: false,
};
