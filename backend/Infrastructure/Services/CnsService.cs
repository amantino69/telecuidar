using System.Diagnostics;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml;
using Application.DTOs.Cns;
using Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

/// <summary>
/// Serviço de integração com CADSUS (Cadastro Nacional de Usuários do SUS)
/// Utiliza certificado digital A1 (.pfx) para autenticação e requisições SOAP
/// Funciona em Windows, Linux e macOS
/// </summary>
public class CnsService : ICnsService
{
    private readonly ILogger<CnsService> _logger;
    private readonly HttpClient _httpClient;
    
    // Token JWT e gerenciamento de cache
    private string? _token;
    private DateTime? _tokenExpiry;
    private readonly object _tokenLock = new();
    
    // Configurações
    private readonly string? _certPath;
    private readonly string? _certPassword;
    private readonly string _ambiente;
    private readonly string _authUrl;
    private readonly string _queryUrl;
    private readonly bool _isConfigured;
    
    // URLs do DATASUS
    private const string AUTH_URL_HMG = "https://ehr-auth-hmg.saude.gov.br/api/osb/token";
    private const string AUTH_URL_PROD = "https://ehr-auth.saude.gov.br/api/osb/token";
    private const string QUERY_URL_HMG = "https://servicoshm.saude.gov.br/cadsus/v2/PDQSupplierJWT";
    private const string QUERY_URL_PROD = "https://servicos.saude.gov.br/cadsus/v2/PDQSupplierJWT";

    // Mapeamentos de códigos
    private static readonly Dictionary<string, string> RacaMap = new()
    {
        ["01"] = "Branca",
        ["02"] = "Preta",
        ["03"] = "Parda",
        ["04"] = "Amarela",
        ["05"] = "Indígena",
        ["99"] = "Sem informação"
    };

    private static readonly Dictionary<string, string> PaisMap = new()
    {
        ["010"] = "Brasil", ["020"] = "Argentina", ["023"] = "Bolívia", ["031"] = "Chile",
        ["035"] = "Colômbia", ["039"] = "Equador", ["045"] = "Guiana Francesa", ["047"] = "Guiana",
        ["053"] = "Paraguai", ["055"] = "Peru", ["063"] = "Suriname", ["067"] = "Uruguai",
        ["071"] = "Venezuela", ["077"] = "Antígua e Barbuda", ["081"] = "Bahamas", ["085"] = "Barbados",
        ["088"] = "Belize", ["090"] = "Bermudas", ["093"] = "Canadá", ["097"] = "Costa Rica",
        ["098"] = "Cuba", ["101"] = "Dominica", ["109"] = "El Salvador", ["110"] = "Estados Unidos",
        ["114"] = "Granada", ["118"] = "Groelândia", ["121"] = "Guadalupe", ["124"] = "Guatemala",
        ["127"] = "Haiti", ["130"] = "Honduras", ["133"] = "Ilhas Cayman", ["136"] = "Ilhas Malvinas",
        ["137"] = "Ilhas Virgens Americanas", ["138"] = "Ilhas Virgens Britânicas", ["140"] = "Jamaica",
        ["143"] = "Martinica", ["145"] = "México", ["147"] = "Montserrat", ["149"] = "Nicarágua",
        ["152"] = "Panamá", ["155"] = "Porto Rico", ["160"] = "República Dominicana", ["163"] = "Santa Lúcia",
        ["166"] = "São Vicente e Granadinas", ["169"] = "Trinidad e Tobago", ["190"] = "Alemanha",
        ["193"] = "Áustria", ["195"] = "Bélgica", ["198"] = "Bulgária", ["201"] = "Dinamarca",
        ["203"] = "Eslováquia", ["204"] = "Eslovênia", ["205"] = "Espanha", ["207"] = "Finlândia",
        ["211"] = "França", ["215"] = "Grécia", ["217"] = "Hungria", ["221"] = "Irlanda",
        ["225"] = "Islândia", ["227"] = "Itália", ["229"] = "Letônia", ["230"] = "Lituânia",
        ["231"] = "Luxemburgo", ["235"] = "Noruega", ["239"] = "Países Baixos", ["241"] = "Polônia",
        ["245"] = "Portugal", ["246"] = "Reino Unido", ["249"] = "Romênia", ["251"] = "Rússia",
        ["253"] = "Ucrânia", ["255"] = "Croácia", ["256"] = "Bósnia-Herzegovina", ["259"] = "Macedônia do Norte",
        ["267"] = "Albânia", ["275"] = "Angola", ["281"] = "Cabo Verde", ["289"] = "Egito",
        ["291"] = "Etiópia", ["297"] = "Gana", ["299"] = "Guiné", ["310"] = "Marrocos",
        ["313"] = "Moçambique", ["318"] = "Nigéria", ["323"] = "Quênia", ["334"] = "África do Sul",
        ["337"] = "Tunísia", ["341"] = "Zimbábue", ["351"] = "Arábia Saudita", ["355"] = "China",
        ["357"] = "Coreia do Norte", ["358"] = "Coreia do Sul", ["361"] = "Filipinas",
        ["365"] = "Índia", ["369"] = "Indonésia", ["372"] = "Iraque", ["375"] = "Irã",
        ["379"] = "Israel", ["383"] = "Japão", ["391"] = "Líbano", ["395"] = "Malásia",
        ["399"] = "Paquistão", ["403"] = "Síria", ["411"] = "Tailândia", ["420"] = "Turquia",
        ["423"] = "Vietnã", ["611"] = "Austrália", ["615"] = "Nova Zelândia"
    };

    private static readonly Dictionary<string, string> TipoLogradouroMap = new()
    {
        ["001"] = "Rua", ["002"] = "Avenida", ["003"] = "Travessa", ["004"] = "Alameda",
        ["005"] = "Praça", ["006"] = "Largo", ["007"] = "Rodovia", ["008"] = "Estrada",
        ["081"] = "Rua"
    };

    public CnsService(ILogger<CnsService> logger)
    {
        _logger = logger;
        
        // Configurar variáveis de ambiente
        _certPath = Environment.GetEnvironmentVariable("CNS_CERT_PATH") 
                    ?? Environment.GetEnvironmentVariable("CADSUS_CERT_PATH");
        _certPassword = Environment.GetEnvironmentVariable("CNS_CERT_PASSWORD") 
                        ?? Environment.GetEnvironmentVariable("CADSUS_CERT_PASSWORD");
        _ambiente = Environment.GetEnvironmentVariable("CNS_AMBIENTE") 
                    ?? Environment.GetEnvironmentVariable("CADSUS_AMBIENTE") 
                    ?? "producao";
        
        var isProd = _ambiente.Equals("producao", StringComparison.OrdinalIgnoreCase) 
                     || _ambiente.Equals("prod", StringComparison.OrdinalIgnoreCase);
        _authUrl = isProd ? AUTH_URL_PROD : AUTH_URL_HMG;
        _queryUrl = isProd ? QUERY_URL_PROD : QUERY_URL_HMG;
        
        // Verificar configuração
        _isConfigured = !string.IsNullOrEmpty(_certPath) && File.Exists(_certPath);
        
        if (_isConfigured)
        {
            _logger.LogInformation("CNS Service configurado. Ambiente: {Ambiente}, Certificado: {CertPath}", 
                _ambiente, _certPath);
        }
        else
        {
            _logger.LogWarning("CNS Service não configurado. Defina CNS_CERT_PATH e CNS_CERT_PASSWORD.");
        }
        
        // Configurar HttpClient com handler que aceita certificados
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
        };
        _httpClient = new HttpClient(handler);
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public bool IsConfigured() => _isConfigured;

    public async Task<CnsCidadaoDto> ConsultarCpfAsync(string cpf)
    {
        if (!_isConfigured)
        {
            throw new InvalidOperationException(
                "Serviço CNS não configurado. Configure as variáveis de ambiente CNS_CERT_PATH e CNS_CERT_PASSWORD.");
        }

        // Limpar CPF
        var cleanCpf = Regex.Replace(cpf, @"\D", "");
        if (cleanCpf.Length != 11)
        {
            throw new ArgumentException("CPF deve conter 11 dígitos.");
        }

        _logger.LogInformation("Consultando CPF: {Cpf}", MaskCpf(cleanCpf));

        // Obter token
        var token = await GetTokenAsync();
        
        // Montar requisição SOAP
        var soapRequest = BuildSoapRequest(cleanCpf);
        
        // Executar requisição
        var responseXml = await ExecuteSoapRequestAsync(soapRequest, token);
        
        // Parsear resposta
        var cidadao = await ParseSoapResponseAsync(responseXml);
        
        _logger.LogInformation("Consulta CNS concluída para CPF: {Cpf}", MaskCpf(cleanCpf));
        
        return cidadao;
    }

    public CnsTokenStatusDto GetTokenStatus()
    {
        lock (_tokenLock)
        {
            if (string.IsNullOrEmpty(_token) || !_tokenExpiry.HasValue)
            {
                return new CnsTokenStatusDto
                {
                    HasToken = false,
                    Message = "Nenhum token disponível"
                };
            }

            var now = DateTime.UtcNow;
            var isValid = now < _tokenExpiry.Value;
            var expiresIn = isValid ? _tokenExpiry.Value - now : TimeSpan.Zero;

            return new CnsTokenStatusDto
            {
                HasToken = true,
                IsValid = isValid,
                ExpiresAt = _tokenExpiry.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm:ss"),
                ExpiresIn = $"{(int)expiresIn.TotalMinutes} minutos",
                ExpiresInMs = (long)expiresIn.TotalMilliseconds
            };
        }
    }

    public async Task<CnsTokenStatusDto> ForceTokenRenewalAsync()
    {
        _logger.LogInformation("Forçando renovação do token CNS...");
        
        lock (_tokenLock)
        {
            _token = null;
            _tokenExpiry = null;
        }
        
        await GetTokenAsync();
        return GetTokenStatus();
    }

    private async Task<string> GetTokenAsync()
    {
        // Verificar cache com margem de 5 minutos
        lock (_tokenLock)
        {
            if (!string.IsNullOrEmpty(_token) && _tokenExpiry.HasValue 
                && DateTime.UtcNow < _tokenExpiry.Value.AddMinutes(-5))
            {
                _logger.LogDebug("Usando token em cache");
                return _token;
            }
        }

        _logger.LogInformation("Obtendo novo token do DATASUS...");

        try
        {
            string responseJson;
            
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                // Windows: usar PowerShell para autenticação com certificado
                responseJson = await GetTokenViaWindowsAsync();
            }
            else
            {
                // Linux/macOS: usar curl ou HttpClient com certificado
                responseJson = await GetTokenViaCurlAsync();
            }

            // Parsear resposta JSON
            using var doc = JsonDocument.Parse(responseJson);
            var accessToken = doc.RootElement.GetProperty("access_token").GetString();
            
            if (string.IsNullOrEmpty(accessToken))
            {
                throw new InvalidOperationException("Token de acesso não encontrado na resposta");
            }

            lock (_tokenLock)
            {
                _token = accessToken;
                _tokenExpiry = DateTime.UtcNow.AddMinutes(30); // Token válido por 30 minutos
            }

            _logger.LogInformation("Token obtido com sucesso. Expira em: {Expiry}", 
                _tokenExpiry?.ToLocalTime().ToString("HH:mm:ss"));
            
            return _token;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao obter token do DATASUS");
            throw new InvalidOperationException($"Falha ao obter token de autenticação: {ex.Message}", ex);
        }
    }

    private async Task<string> GetTokenViaWindowsAsync()
    {
        // Usar PowerShell no Windows para autenticação com certificado
        var psScript = $@"
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('{_certPath}', '{_certPassword}')
$response = Invoke-WebRequest -Uri '{_authUrl}' -Certificate $cert -UseBasicParsing
$response.Content
";

        var tempScript = Path.Combine(Path.GetTempPath(), $"cns_auth_{Guid.NewGuid()}.ps1");
        try
        {
            await File.WriteAllTextAsync(tempScript, psScript, Encoding.UTF8);
            
            var psi = new ProcessStartInfo
            {
                FileName = "powershell",
                Arguments = $"-ExecutionPolicy Bypass -File \"{tempScript}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                throw new InvalidOperationException("Falha ao iniciar PowerShell");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError("PowerShell error: {Error}", error);
                throw new InvalidOperationException($"Erro no PowerShell: {error}");
            }

            return output.Trim();
        }
        finally
        {
            if (File.Exists(tempScript))
            {
                File.Delete(tempScript);
            }
        }
    }

    private async Task<string> GetTokenViaCurlAsync()
    {
        // Linux/macOS: usar curl com certificado PFX
        var tempPem = Path.Combine(Path.GetTempPath(), $"cns_cert_{Guid.NewGuid()}.pem");
        var tempKey = Path.Combine(Path.GetTempPath(), $"cns_key_{Guid.NewGuid()}.pem");
        
        try
        {
            // Extrair PEM do PFX
            await ExtractPemFromPfxAsync(tempPem, tempKey);
            
            var psi = new ProcessStartInfo
            {
                FileName = "curl",
                Arguments = $"-s --cert \"{tempPem}\" --key \"{tempKey}\" \"{_authUrl}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                throw new InvalidOperationException("Falha ao iniciar curl");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError("Curl error: {Error}", error);
                throw new InvalidOperationException($"Erro no curl: {error}");
            }

            return output.Trim();
        }
        finally
        {
            if (File.Exists(tempPem)) File.Delete(tempPem);
            if (File.Exists(tempKey)) File.Delete(tempKey);
        }
    }

    private async Task ExtractPemFromPfxAsync(string certPath, string keyPath)
    {
        var cert = X509CertificateLoader.LoadPkcs12FromFile(_certPath!, _certPassword, 
            X509KeyStorageFlags.Exportable | X509KeyStorageFlags.MachineKeySet);
        
        // Exportar certificado
        var certPem = new StringBuilder();
        certPem.AppendLine("-----BEGIN CERTIFICATE-----");
        certPem.AppendLine(Convert.ToBase64String(cert.RawData, Base64FormattingOptions.InsertLineBreaks));
        certPem.AppendLine("-----END CERTIFICATE-----");
        await File.WriteAllTextAsync(certPath, certPem.ToString());
        
        // Exportar chave privada
        var privateKey = cert.GetRSAPrivateKey();
        if (privateKey != null)
        {
            var keyBytes = privateKey.ExportRSAPrivateKey();
            var keyPem = new StringBuilder();
            keyPem.AppendLine("-----BEGIN RSA PRIVATE KEY-----");
            keyPem.AppendLine(Convert.ToBase64String(keyBytes, Base64FormattingOptions.InsertLineBreaks));
            keyPem.AppendLine("-----END RSA PRIVATE KEY-----");
            await File.WriteAllTextAsync(keyPath, keyPem.ToString());
        }
    }

    private string BuildSoapRequest(string cpf)
    {
        return $@"<soap:Envelope xmlns:soap=""http://www.w3.org/2003/05/soap-envelope"" xmlns:urn=""urn:ihe:iti:xds-b:2007"" xmlns:urn1=""urn:oasis:names:tc:ebxml-regrep:xsd:lcm:3.0"" xmlns:urn2=""urn:oasis:names:tc:ebxml-regrep:xsd:rim:3.0"" xmlns:urn3=""urn:ihe:iti:xds-b:2007"">
  <soap:Body>
    <PRPA_IN201305UV02 xsi:schemaLocation=""urn:hl7-org:v3 ./schema/HL7V3/NE2008/multicacheschemas/PRPA_IN201305UV02.xsd"" ITSVersion=""XML_1.0"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns=""urn:hl7-org:v3"">
      <id root=""2.16.840.1.113883.4.714"" extension=""123456""/>
      <creationTime value=""{DateTime.UtcNow:yyyyMMddHHmmss}""/>
      <interactionId root=""2.16.840.1.113883.1.6"" extension=""PRPA_IN201305UV02""/>
      <processingCode code=""T""/>
      <processingModeCode code=""T""/>
      <acceptAckCode code=""AL""/>
      <receiver typeCode=""RCV"">
        <device classCode=""DEV"" determinerCode=""INSTANCE"">
          <id root=""2.16.840.1.113883.3.72.6.5.100.85""/>
        </device>
      </receiver>
      <sender typeCode=""SND"">
        <device classCode=""DEV"" determinerCode=""INSTANCE"">
          <id root=""2.16.840.1.113883.3.72.6.2""/>
          <name>CADSUS</name>
        </device>
      </sender>
      <controlActProcess classCode=""CACT"" moodCode=""EVN"">
        <code code=""PRPA_TE201305UV02"" codeSystem=""2.16.840.1.113883.1.6""/>
        <queryByParameter>
          <queryId root=""1.2.840.114350.1.13.28.1.18.5.999"" extension=""{Guid.NewGuid()}""/>
          <statusCode code=""new""/>
          <responseModalityCode code=""R""/>
          <responsePriorityCode code=""I""/>
          <parameterList>
            <livingSubjectId>
              <value root=""2.16.840.1.113883.13.237"" extension=""{cpf}""/>
              <semanticsText>LivingSubject.id</semanticsText>
            </livingSubjectId>
          </parameterList>
        </queryByParameter>
      </controlActProcess>
    </PRPA_IN201305UV02>
  </soap:Body>
</soap:Envelope>";
    }

    private async Task<string> ExecuteSoapRequestAsync(string soapRequest, string token)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return await ExecuteSoapViaWindowsAsync(soapRequest, token);
        }
        else
        {
            return await ExecuteSoapViaCurlAsync(soapRequest, token);
        }
    }

    private async Task<string> ExecuteSoapViaWindowsAsync(string soapRequest, string token)
    {
        var tempSoap = Path.Combine(Path.GetTempPath(), $"cns_soap_{Guid.NewGuid()}.xml");
        var tempScript = Path.Combine(Path.GetTempPath(), $"cns_query_{Guid.NewGuid()}.ps1");
        
        try
        {
            await File.WriteAllTextAsync(tempSoap, soapRequest, Encoding.UTF8);
            
            var psScript = $@"
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('{_certPath}', '{_certPassword}')
$headers = @{{
  'Content-Type' = 'application/soap+xml; charset=utf-8'
  'Authorization' = 'jwt {token}'
}}
$body = Get-Content -Path '{tempSoap}' -Raw -Encoding UTF8

try {{
  $response = Invoke-WebRequest -Uri '{_queryUrl}' -Method POST -Headers $headers -Body $body -Certificate $cert -UseBasicParsing
  Write-Output $response.Content
}} catch {{
  $errorDetails = @{{
    StatusCode = $_.Exception.Response.StatusCode.value__
    StatusDescription = $_.Exception.Response.StatusDescription
    ErrorMessage = $_.Exception.Message
  }}
  Write-Error ($errorDetails | ConvertTo-Json -Compress)
  exit 1
}}
";

            await File.WriteAllTextAsync(tempScript, psScript, Encoding.UTF8);
            
            var psi = new ProcessStartInfo
            {
                FileName = "powershell",
                Arguments = $"-ExecutionPolicy Bypass -File \"{tempScript}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                throw new InvalidOperationException("Falha ao iniciar PowerShell");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError("SOAP request failed: {Error}", error);
                throw new InvalidOperationException($"Erro na requisição SOAP: {error}");
            }

            return output;
        }
        finally
        {
            if (File.Exists(tempSoap)) File.Delete(tempSoap);
            if (File.Exists(tempScript)) File.Delete(tempScript);
        }
    }

    private async Task<string> ExecuteSoapViaCurlAsync(string soapRequest, string token)
    {
        var tempSoap = Path.Combine(Path.GetTempPath(), $"cns_soap_{Guid.NewGuid()}.xml");
        var tempPem = Path.Combine(Path.GetTempPath(), $"cns_cert_{Guid.NewGuid()}.pem");
        var tempKey = Path.Combine(Path.GetTempPath(), $"cns_key_{Guid.NewGuid()}.pem");
        
        try
        {
            await File.WriteAllTextAsync(tempSoap, soapRequest, Encoding.UTF8);
            await ExtractPemFromPfxAsync(tempPem, tempKey);
            
            var psi = new ProcessStartInfo
            {
                FileName = "curl",
                Arguments = $"-s -X POST " +
                           $"-H \"Content-Type: application/soap+xml; charset=utf-8\" " +
                           $"-H \"Authorization: jwt {token}\" " +
                           $"--cert \"{tempPem}\" --key \"{tempKey}\" " +
                           $"-d @\"{tempSoap}\" " +
                           $"\"{_queryUrl}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                throw new InvalidOperationException("Falha ao iniciar curl");
            }

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError("SOAP request via curl failed: {Error}", error);
                throw new InvalidOperationException($"Erro na requisição SOAP: {error}");
            }

            return output;
        }
        finally
        {
            if (File.Exists(tempSoap)) File.Delete(tempSoap);
            if (File.Exists(tempPem)) File.Delete(tempPem);
            if (File.Exists(tempKey)) File.Delete(tempKey);
        }
    }

    private async Task<CnsCidadaoDto> ParseSoapResponseAsync(string xml)
    {
        var doc = new XmlDocument();
        doc.LoadXml(xml);

        var nsmgr = new XmlNamespaceManager(doc.NameTable);
        nsmgr.AddNamespace("soap", "http://www.w3.org/2003/05/soap-envelope");
        nsmgr.AddNamespace("hl7", "urn:hl7-org:v3");

        var cidadao = new CnsCidadaoDto();

        try
        {
            // CPF
            var cpfNode = doc.SelectSingleNode("//hl7:id[@root='2.16.840.1.113883.13.237']/@extension", nsmgr);
            if (cpfNode != null)
            {
                var cpfRaw = cpfNode.Value ?? "";
                cidadao.Cpf = FormatCpf(cpfRaw);
            }

            // CNS
            var cnsNodes = doc.SelectNodes("//hl7:asOtherIDs/hl7:id[@root='2.16.840.1.113883.13.236']/@extension", nsmgr);
            var cnsList = new List<string>();
            if (cnsNodes != null)
            {
                foreach (XmlNode node in cnsNodes)
                {
                    if (!string.IsNullOrEmpty(node.Value))
                    {
                        cnsList.Add(node.Value);
                    }
                }
            }
            cidadao.Cns = string.Join(", ", cnsList);

            // Nome
            var nomeNode = doc.SelectSingleNode("//hl7:name[@use='L']/hl7:given/text()", nsmgr);
            cidadao.Nome = nomeNode?.Value?.Trim() ?? "";

            // Data de Nascimento
            var birthNode = doc.SelectSingleNode("//hl7:birthTime/@value", nsmgr);
            if (birthNode != null && !string.IsNullOrEmpty(birthNode.Value) && birthNode.Value.Length >= 8)
            {
                var raw = birthNode.Value;
                cidadao.DataNascimento = $"{raw[6..8]}/{raw[4..6]}/{raw[..4]}";
            }

            // Sexo
            var genderNode = doc.SelectSingleNode("//hl7:administrativeGenderCode/@code", nsmgr);
            if (genderNode != null)
            {
                cidadao.Sexo = genderNode.Value == "M" ? "Masculino" : 
                              genderNode.Value == "F" ? "Feminino" : genderNode.Value ?? "";
            }

            // Raça/Cor
            var raceNode = doc.SelectSingleNode("//hl7:raceCode/@code", nsmgr);
            if (raceNode != null && RacaMap.TryGetValue(raceNode.Value ?? "", out var raca))
            {
                cidadao.RacaCor = raca;
            }
            else
            {
                cidadao.RacaCor = raceNode?.Value ?? "";
            }

            // Nome da Mãe
            var maeNode = doc.SelectSingleNode("//hl7:personalRelationship[hl7:code/@code='PRN']/hl7:relationshipHolder1/hl7:name/hl7:given/text()", nsmgr);
            cidadao.NomeMae = maeNode?.Value?.Trim() ?? "";

            // Nome do Pai
            var paiNode = doc.SelectSingleNode("//hl7:personalRelationship[hl7:code/@code='NPRN']/hl7:relationshipHolder1/hl7:name/hl7:given/text()", nsmgr);
            cidadao.NomePai = paiNode?.Value?.Trim() ?? "";

            // Endereço
            var addrNode = doc.SelectSingleNode("//hl7:addr[@use='H']", nsmgr);
            if (addrNode != null)
            {
                var streetNode = addrNode.SelectSingleNode("hl7:streetName/text()", nsmgr);
                cidadao.Logradouro = streetNode?.Value?.Trim() ?? "";

                var streetTypeNode = addrNode.SelectSingleNode("hl7:streetNameType/text()", nsmgr);
                var tipoCode = streetTypeNode?.Value?.Trim() ?? "";
                cidadao.TipoLogradouro = TipoLogradouroMap.TryGetValue(tipoCode, out var tipo) ? tipo : tipoCode;

                var numberNode = addrNode.SelectSingleNode("hl7:houseNumber/text()", nsmgr);
                cidadao.Numero = numberNode?.Value?.Trim() ?? "";

                var complementNode = addrNode.SelectSingleNode("hl7:additionalLocator/text()", nsmgr);
                cidadao.Complemento = complementNode?.Value?.Trim() ?? "";

                var cityNode = addrNode.SelectSingleNode("hl7:city/text()", nsmgr);
                var codigoCidade = cityNode?.Value?.Trim() ?? "";
                cidadao.CodigoCidade = codigoCidade;
                
                // Buscar nome da cidade via IBGE
                cidadao.Cidade = await GetCityNameAsync(codigoCidade);

                var cepNode = addrNode.SelectSingleNode("hl7:postalCode/text()", nsmgr);
                var cepRaw = cepNode?.Value?.Trim() ?? "";
                cidadao.Cep = FormatCep(cepRaw);

                var countryNode = addrNode.SelectSingleNode("hl7:country/text()", nsmgr);
                var paisCode = countryNode?.Value?.Trim() ?? "";
                cidadao.PaisEnderecoAtual = PaisMap.TryGetValue(paisCode, out var pais) ? pais : paisCode;
            }

            // Montar endereço completo
            var partes = new[] { cidadao.TipoLogradouro, cidadao.Logradouro, cidadao.Numero, 
                                 cidadao.Complemento, cidadao.Cidade, cidadao.Cep }
                .Where(p => !string.IsNullOrEmpty(p));
            cidadao.EnderecoCompleto = string.Join(", ", partes);

            // Naturalidade
            var birthPlaceNode = doc.SelectSingleNode("//hl7:birthPlace/hl7:addr/hl7:city/text()", nsmgr);
            var codigoCidadeNasc = birthPlaceNode?.Value?.Trim() ?? "";
            cidadao.CodigoCidadeNascimento = codigoCidadeNasc;
            cidadao.CidadeNascimento = await GetCityNameAsync(codigoCidadeNasc);

            var birthCountryNode = doc.SelectSingleNode("//hl7:birthPlace/hl7:addr/hl7:country/text()", nsmgr);
            var paisNascCode = birthCountryNode?.Value?.Trim() ?? "";
            cidadao.CodigoPaisNascimento = paisNascCode;
            cidadao.PaisNascimento = PaisMap.TryGetValue(paisNascCode, out var paisNasc) ? paisNasc : paisNascCode;

            // Telefones
            var telecomNodes = doc.SelectNodes("//hl7:telecom/@value", nsmgr);
            if (telecomNodes != null)
            {
                foreach (XmlNode node in telecomNodes)
                {
                    var value = node.Value ?? "";
                    if (value.StartsWith("+") || value.StartsWith("tel:"))
                    {
                        cidadao.Telefones.Add(FormatPhone(value.Replace("tel:", "")));
                    }
                    else if (value.Contains("@") || value.StartsWith("mailto:"))
                    {
                        cidadao.Emails.Add(value.Replace("mailto:", ""));
                    }
                }
            }

            // Status do Cadastro
            var statusNode = doc.SelectSingleNode("//hl7:patient/hl7:statusCode/@code", nsmgr);
            if (statusNode != null)
            {
                cidadao.StatusCadastro = statusNode.Value == "active" ? "Ativo" : 
                                          statusNode.Value == "inactive" ? "Inativo" : statusNode.Value ?? "";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao parsear resposta SOAP");
            throw new InvalidOperationException("Erro ao processar resposta do CADSUS", ex);
        }

        return cidadao;
    }

    private async Task<string> GetCityNameAsync(string codigoIbge)
    {
        if (string.IsNullOrEmpty(codigoIbge)) return "";

        try
        {
            // Código IBGE pode ter 6 ou 7 dígitos
            var codigo = codigoIbge.Length == 6 ? codigoIbge + "0" : codigoIbge;
            
            var response = await _httpClient.GetStringAsync(
                $"https://servicodados.ibge.gov.br/api/v1/localidades/municipios/{codigo}");
            
            using var doc = JsonDocument.Parse(response);
            var nome = doc.RootElement.GetProperty("nome").GetString() ?? "";
            var uf = doc.RootElement.GetProperty("microrregiao")
                        .GetProperty("mesorregiao")
                        .GetProperty("UF")
                        .GetProperty("sigla").GetString() ?? "";
            
            return $"{nome}/{uf}";
        }
        catch
        {
            return codigoIbge;
        }
    }

    private static string FormatCpf(string cpf)
    {
        if (string.IsNullOrEmpty(cpf) || cpf.Length != 11) return cpf;
        return $"{cpf[..3]}.{cpf[3..6]}.{cpf[6..9]}-{cpf[9..]}";
    }

    private static string FormatCep(string cep)
    {
        if (string.IsNullOrEmpty(cep) || cep.Length != 8) return cep;
        return $"{cep[..5]}-{cep[5..]}";
    }

    private static string FormatPhone(string phone)
    {
        if (string.IsNullOrEmpty(phone)) return phone;
        
        var cleaned = Regex.Replace(phone.Replace("+55", "").Replace("-", ""), @"\D", "");
        
        return cleaned.Length switch
        {
            11 => $"({cleaned[..2]}) {cleaned[2..7]}-{cleaned[7..]}",
            10 => $"({cleaned[..2]}) {cleaned[2..6]}-{cleaned[6..]}",
            _ => phone
        };
    }

    private static string MaskCpf(string cpf)
    {
        if (string.IsNullOrEmpty(cpf) || cpf.Length != 11) return "***";
        return $"{cpf[..3]}.***.***.{cpf[9..]}";
    }
}
