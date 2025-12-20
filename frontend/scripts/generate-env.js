/**
 * Script para gerar os arquivos environment.ts a partir do .env
 * 
 * Este script lê o arquivo .env na raiz do projeto e gera os arquivos
 * de environment do Angular automaticamente.
 * 
 * Uso: node scripts/generate-env.js
 */

const fs = require('fs');
const path = require('path');

// Caminho para o .env na raiz do projeto (um nível acima do frontend)
const envPath = path.resolve(__dirname, '..', '..', '.env');
const envExamplePath = path.resolve(__dirname, '..', '..', '.env.example');

// Destino dos arquivos de environment
const environmentDir = path.resolve(__dirname, '..', 'src', 'environments');

/**
 * Lê e parseia um arquivo .env
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Arquivo não encontrado: ${filePath}`);
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    // Ignorar comentários e linhas vazias
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    // Encontrar o primeiro = e dividir
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) return;

    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();

    // Remover aspas se existirem
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  });

  return env;
}

/**
 * Gera o conteúdo do arquivo environment.ts
 */
function generateEnvironmentContent(env, isProduction = false) {
  const apiUrl = env.API_URL || 'http://localhost:5239/api';
  const jitsiDomain = env.JITSI_DOMAIN || 'meet.jit.si';
  const jitsiEnabled = env.JITSI_ENABLED === 'true';

  if (isProduction) {
    return `// Este arquivo é gerado automaticamente pelo script generate-env.js
// NÃO EDITE MANUALMENTE - Edite o arquivo .env na raiz do projeto

export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  jitsiDomain: '${jitsiDomain}',
  jitsiEnabled: ${jitsiEnabled},
};
`;
  }

  // Para desenvolvimento, mantemos a lógica dinâmica de host
  const backendPort = env.BACKEND_PORT || '5239';
  
  return `// Este arquivo é gerado automaticamente pelo script generate-env.js
// NÃO EDITE MANUALMENTE - Edite o arquivo .env na raiz do projeto

// Determina dinamicamente a URL da API baseado no host atual
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Se acessando via IP ou não-localhost, usar o mesmo host para API
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return \`http://\${host}:${backendPort}/api\`;
    }
  }
  return '${apiUrl}';
};

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  jitsiDomain: '${jitsiDomain}',
  jitsiEnabled: ${jitsiEnabled},
};
`;
}

/**
 * Função principal
 */
function main() {
  console.log('🔧 Gerando arquivos de environment...\n');

  // Tentar ler .env, se não existir usar .env.example
  let env = parseEnvFile(envPath);
  
  if (Object.keys(env).length === 0) {
    console.log('📋 Arquivo .env não encontrado, usando .env.example como base...');
    env = parseEnvFile(envExamplePath);
  }

  if (Object.keys(env).length === 0) {
    console.error('❌ Nenhum arquivo de configuração encontrado (.env ou .env.example)');
    process.exit(1);
  }

  // Garantir que o diretório existe
  if (!fs.existsSync(environmentDir)) {
    fs.mkdirSync(environmentDir, { recursive: true });
  }

  // Gerar environment.ts (desenvolvimento)
  const devContent = generateEnvironmentContent(env, false);
  const devPath = path.join(environmentDir, 'environment.ts');
  fs.writeFileSync(devPath, devContent);
  console.log(`✅ Gerado: ${devPath}`);

  // Gerar environment.development.ts
  const devEnvPath = path.join(environmentDir, 'environment.development.ts');
  fs.writeFileSync(devEnvPath, devContent);
  console.log(`✅ Gerado: ${devEnvPath}`);

  // Gerar environment.prod.ts (produção)
  const prodContent = generateEnvironmentContent(env, true);
  const prodPath = path.join(environmentDir, 'environment.prod.ts');
  fs.writeFileSync(prodPath, prodContent);
  console.log(`✅ Gerado: ${prodPath}`);

  console.log('\n🎉 Arquivos de environment gerados com sucesso!');
  console.log('📝 Para alterar as configurações, edite o arquivo .env na raiz do projeto.');
}

main();
