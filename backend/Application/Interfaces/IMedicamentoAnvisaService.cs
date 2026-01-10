using Application.DTOs.Medicamentos;

namespace Application.Interfaces;

public interface IMedicamentoAnvisaService
{
    Task<MedicamentoSearchResultDto> SearchMedicamentosAsync(string query, int page = 1, int pageSize = 20);
    Task<int> GetTotalCountAsync();
    Task LoadDataAsync();
}
