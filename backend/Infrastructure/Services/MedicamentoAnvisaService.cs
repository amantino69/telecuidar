using Application.DTOs.Medicamentos;
using Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text;

namespace Infrastructure.Services;

public class MedicamentoAnvisaService : IMedicamentoAnvisaService
{
    private readonly ILogger<MedicamentoAnvisaService> _logger;
    private readonly string _csvFilePath;
    private List<MedicamentoAnvisaDto> _medicamentos = new();
    private bool _isLoaded = false;
    private readonly SemaphoreSlim _loadLock = new(1, 1);

    public MedicamentoAnvisaService(ILogger<MedicamentoAnvisaService> logger)
    {
        _logger = logger;
        // O caminho será relativo ao diretório de execução
        _csvFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "medicamentos-anvisa.csv");
    }

    public async Task LoadDataAsync()
    {
        if (_isLoaded) return;

        await _loadLock.WaitAsync();
        try
        {
            if (_isLoaded) return;

            _logger.LogInformation("Carregando base de medicamentos ANVISA de {Path}", _csvFilePath);

            if (!File.Exists(_csvFilePath))
            {
                _logger.LogWarning("Arquivo de medicamentos não encontrado: {Path}", _csvFilePath);
                _isLoaded = true;
                return;
            }

            var medicamentos = new List<MedicamentoAnvisaDto>();
            
            // Ler o arquivo com encoding Latin1 (ISO-8859-1) que é comum em arquivos do governo brasileiro
            using var reader = new StreamReader(_csvFilePath, Encoding.GetEncoding("ISO-8859-1"));
            
            // Ler header
            var header = await reader.ReadLineAsync();
            if (header == null)
            {
                _logger.LogWarning("Arquivo de medicamentos vazio");
                _isLoaded = true;
                return;
            }

            var columns = header.Split(';');
            var colIndexes = new Dictionary<string, int>();
            for (int i = 0; i < columns.Length; i++)
            {
                colIndexes[columns[i].Trim().ToUpperInvariant()] = i;
            }

            // Verificar colunas necessárias
            if (!colIndexes.ContainsKey("NOME_PRODUTO") || !colIndexes.ContainsKey("NUMERO_REGISTRO_PRODUTO"))
            {
                _logger.LogError("Arquivo CSV não contém as colunas necessárias");
                _isLoaded = true;
                return;
            }

            string? line;
            int lineNumber = 1;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                lineNumber++;
                try
                {
                    var values = ParseCsvLine(line, ';');
                    if (values.Length < columns.Length) continue;

                    // Filtrar apenas medicamentos com registro válido
                    var situacao = GetValue(values, colIndexes, "SITUACAO_REGISTRO");
                    if (!situacao.Contains("LIDO", StringComparison.OrdinalIgnoreCase) && 
                        !situacao.Equals("ATIVO", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var nome = GetValue(values, colIndexes, "NOME_PRODUTO").Trim();
                    if (string.IsNullOrWhiteSpace(nome)) continue;

                    medicamentos.Add(new MedicamentoAnvisaDto
                    {
                        Codigo = GetValue(values, colIndexes, "NUMERO_REGISTRO_PRODUTO"),
                        Nome = nome,
                        PrincipioAtivo = GetValue(values, colIndexes, "PRINCIPIO_ATIVO"),
                        ClasseTerapeutica = GetValue(values, colIndexes, "CLASSE_TERAPEUTICA"),
                        CategoriaRegulatoria = GetValue(values, colIndexes, "CATEGORIA_REGULATORIA"),
                        Empresa = ExtractEmpresaName(GetValue(values, colIndexes, "EMPRESA_DETENTORA_REGISTRO"))
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Erro ao processar linha {Line}: {Error}", lineNumber, ex.Message);
                }
            }

            _medicamentos = medicamentos;
            _isLoaded = true;
            _logger.LogInformation("Carregados {Count} medicamentos da base ANVISA", _medicamentos.Count);
        }
        finally
        {
            _loadLock.Release();
        }
    }

    public async Task<MedicamentoSearchResultDto> SearchMedicamentosAsync(string query, int page = 1, int pageSize = 20)
    {
        await LoadDataAsync();

        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return new MedicamentoSearchResultDto
            {
                Medicamentos = new List<MedicamentoAnvisaDto>(),
                TotalResults = 0,
                Page = page,
                PageSize = pageSize
            };
        }

        var queryNormalized = NormalizeString(query);

        var results = _medicamentos
            .Where(m => 
                NormalizeString(m.Nome).Contains(queryNormalized) ||
                (m.PrincipioAtivo != null && NormalizeString(m.PrincipioAtivo).Contains(queryNormalized)) ||
                m.Codigo.Contains(query))
            .OrderBy(m => m.Nome)
            .ToList();

        var totalResults = results.Count;
        var pagedResults = results
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new MedicamentoSearchResultDto
        {
            Medicamentos = pagedResults,
            TotalResults = totalResults,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<int> GetTotalCountAsync()
    {
        await LoadDataAsync();
        return _medicamentos.Count;
    }

    private static string GetValue(string[] values, Dictionary<string, int> colIndexes, string columnName)
    {
        if (colIndexes.TryGetValue(columnName, out int index) && index < values.Length)
        {
            return values[index].Trim().Trim('"');
        }
        return string.Empty;
    }

    private static string ExtractEmpresaName(string empresaFull)
    {
        // Formato: "CNPJ - NOME DA EMPRESA"
        var parts = empresaFull.Split(" - ", 2);
        return parts.Length > 1 ? parts[1].Trim() : empresaFull.Trim();
    }

    private static string NormalizeString(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        
        // Remove acentos e converte para minúsculas
        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        
        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }
        
        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    private static string[] ParseCsvLine(string line, char delimiter)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;

        foreach (char c in line)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == delimiter && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }
        
        result.Add(current.ToString());
        return result.ToArray();
    }
}
