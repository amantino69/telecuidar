namespace Application.DTOs.Cns;

/// <summary>
/// DTO para requisição de consulta CPF no CADSUS/CNS
/// </summary>
public class CnsConsultaRequestDto
{
    public string Cpf { get; set; } = string.Empty;
}

/// <summary>
/// DTO com dados completos do cidadão retornados pelo CADSUS
/// Mapeado a partir da resposta XML SOAP do DATASUS
/// </summary>
public class CnsCidadaoDto
{
    // Identificação Principal
    public string Cns { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string DataNascimento { get; set; } = string.Empty;
    public string StatusCadastro { get; set; } = string.Empty;
    
    // Filiação
    public string NomeMae { get; set; } = string.Empty;
    public string NomePai { get; set; } = string.Empty;
    
    // Características Pessoais
    public string Sexo { get; set; } = string.Empty;
    public string RacaCor { get; set; } = string.Empty;
    
    // Endereço
    public string TipoLogradouro { get; set; } = string.Empty;
    public string Logradouro { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Complemento { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string CodigoCidade { get; set; } = string.Empty;
    public string Uf { get; set; } = string.Empty;
    public string PaisEnderecoAtual { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public string EnderecoCompleto { get; set; } = string.Empty;
    
    // Naturalidade
    public string CidadeNascimento { get; set; } = string.Empty;
    public string CodigoCidadeNascimento { get; set; } = string.Empty;
    public string PaisNascimento { get; set; } = string.Empty;
    public string CodigoPaisNascimento { get; set; } = string.Empty;
    
    // Contato
    public List<string> Telefones { get; set; } = new();
    public List<string> Emails { get; set; } = new();
}

/// <summary>
/// DTO para status do token JWT do CADSUS
/// </summary>
public class CnsTokenStatusDto
{
    /// <summary>
    /// Indica se existe um token em cache
    /// </summary>
    public bool HasToken { get; set; }
    
    /// <summary>
    /// Indica se o token ainda é válido
    /// </summary>
    public bool IsValid { get; set; }
    
    /// <summary>
    /// Data/hora de expiração do token (formato local)
    /// </summary>
    public string? ExpiresAt { get; set; }
    
    /// <summary>
    /// Tempo restante até expiração (formato legível)
    /// </summary>
    public string? ExpiresIn { get; set; }
    
    /// <summary>
    /// Tempo restante até expiração em milissegundos
    /// </summary>
    public long ExpiresInMs { get; set; }
    
    /// <summary>
    /// Mensagem adicional (para erros ou status especiais)
    /// </summary>
    public string? Message { get; set; }
}

/// <summary>
/// DTO para resposta de renovação de token
/// </summary>
public class CnsTokenRenewResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool HasToken { get; set; }
    public bool IsValid { get; set; }
    public string? ExpiresAt { get; set; }
    public string? ExpiresIn { get; set; }
}
