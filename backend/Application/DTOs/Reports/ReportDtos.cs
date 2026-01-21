namespace Application.DTOs.Reports;

public class AppointmentStatsDto
{
    public int Total { get; set; }
    public int Scheduled { get; set; }
    public int Confirmed { get; set; }
    public int InProgress { get; set; }
    public int Completed { get; set; }
    public int Cancelled { get; set; }
}

public class UserStatsDto
{
    public int TotalUsers { get; set; }
    public int Patients { get; set; }
    public int Professionals { get; set; }
    public int Admins { get; set; }
    public int ActiveUsers { get; set; }
    public int InactiveUsers { get; set; }
}

public class SpecialtyStatsDto
{
    public Guid SpecialtyId { get; set; }
    public string SpecialtyName { get; set; } = string.Empty;
    public int AppointmentCount { get; set; }
    public int ProfessionalCount { get; set; }
}

public class DashboardStatsDto
{
    public AppointmentStatsDto Appointments { get; set; } = new();
    public UserStatsDto Users { get; set; } = new();
    public List<SpecialtyStatsDto> TopSpecialties { get; set; } = new();
    public int TotalNotifications { get; set; }
    public int UnreadNotifications { get; set; }
    
    // Novos campos para dashboard
    public int TodayAppointments { get; set; }
    public int AverageConsultationTime { get; set; } // em minutos
    public List<MonthlyAppointmentsDto> AppointmentsByMonth { get; set; } = new();
}

public class MonthlyAppointmentsDto
{
    public string Month { get; set; } = string.Empty;
    public int Appointments { get; set; }
}

public class AppointmentsByPeriodDto
{
    public string Period { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ReportDto
{
    public DateTime GeneratedAt { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public AppointmentStatsDto Appointments { get; set; } = new();
    public List<AppointmentsByPeriodDto> AppointmentsByDay { get; set; } = new();
    public List<SpecialtyStatsDto> SpecialtiesReport { get; set; } = new();
}
