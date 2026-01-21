namespace Application.DTOs.AI;

public class GenerateSummaryRequestDto
{
    public Guid AppointmentId { get; set; }
    public PatientDataDto? PatientData { get; set; }
    public PreConsultationDataDto? PreConsultationData { get; set; }
    public AnamnesisDataDto? AnamnesisData { get; set; }
    public BiometricsDataDto? BiometricsData { get; set; }
    public SoapDataDto? SoapData { get; set; }
    public SpecialtyFieldsDataDto? SpecialtyFieldsData { get; set; }
}

public class GenerateDiagnosisRequestDto
{
    public Guid AppointmentId { get; set; }
    public string AdditionalContext { get; set; } = string.Empty;
    public PatientDataDto? PatientData { get; set; }
    public PreConsultationDataDto? PreConsultationData { get; set; }
    public AnamnesisDataDto? AnamnesisData { get; set; }
    public BiometricsDataDto? BiometricsData { get; set; }
    public SoapDataDto? SoapData { get; set; }
    public SpecialtyFieldsDataDto? SpecialtyFieldsData { get; set; }
}

public class PatientDataDto
{
    public string? Name { get; set; }
    public string? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? BloodType { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}

public class PreConsultationDataDto
{
    public PersonalInfoDto? PersonalInfo { get; set; }
    public MedicalHistoryDto? MedicalHistory { get; set; }
    public LifestyleHabitsDto? LifestyleHabits { get; set; }
    public VitalSignsDto? VitalSigns { get; set; }
    public CurrentSymptomsDto? CurrentSymptoms { get; set; }
    public string? AdditionalObservations { get; set; }
}

public class PersonalInfoDto
{
    public string? FullName { get; set; }
    public string? BirthDate { get; set; }
    public string? Weight { get; set; }
    public string? Height { get; set; }
}

public class MedicalHistoryDto
{
    public string? ChronicConditions { get; set; }
    public string? Medications { get; set; }
    public string? Allergies { get; set; }
    public string? Surgeries { get; set; }
    public string? GeneralObservations { get; set; }
}

public class LifestyleHabitsDto
{
    public string? Smoker { get; set; }
    public string? AlcoholConsumption { get; set; }
    public string? PhysicalActivity { get; set; }
    public string? GeneralObservations { get; set; }
}

public class VitalSignsDto
{
    public string? BloodPressure { get; set; }
    public string? HeartRate { get; set; }
    public string? Temperature { get; set; }
    public string? OxygenSaturation { get; set; }
    public string? GeneralObservations { get; set; }
}

public class CurrentSymptomsDto
{
    public string? MainSymptoms { get; set; }
    public string? SymptomOnset { get; set; }
    public int? PainIntensity { get; set; }
    public string? GeneralObservations { get; set; }
}

public class AnamnesisDataDto
{
    public string? ChiefComplaint { get; set; }
    public string? PresentIllnessHistory { get; set; }
    public PersonalHistoryDto? PersonalHistory { get; set; }
    public string? FamilyHistory { get; set; }
    public LifestyleDto? Lifestyle { get; set; }
    public SystemsReviewDto? SystemsReview { get; set; }
    public string? AdditionalNotes { get; set; }
}

public class PersonalHistoryDto
{
    public string? PreviousDiseases { get; set; }
    public string? Surgeries { get; set; }
    public string? Hospitalizations { get; set; }
    public string? Allergies { get; set; }
    public string? CurrentMedications { get; set; }
    public string? Vaccinations { get; set; }
}

public class LifestyleDto
{
    public string? Diet { get; set; }
    public string? PhysicalActivity { get; set; }
    public string? Smoking { get; set; }
    public string? Alcohol { get; set; }
    public string? Drugs { get; set; }
    public string? Sleep { get; set; }
}

public class SystemsReviewDto
{
    public string? Cardiovascular { get; set; }
    public string? Respiratory { get; set; }
    public string? Gastrointestinal { get; set; }
    public string? Genitourinary { get; set; }
    public string? Musculoskeletal { get; set; }
    public string? Neurological { get; set; }
    public string? Psychiatric { get; set; }
    public string? Endocrine { get; set; }
    public string? Hematologic { get; set; }
}

public class BiometricsDataDto
{
    public int? HeartRate { get; set; }
    public int? BloodPressureSystolic { get; set; }
    public int? BloodPressureDiastolic { get; set; }
    public int? OxygenSaturation { get; set; }
    public decimal? Temperature { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    public int? Glucose { get; set; }
}

public class SoapDataDto
{
    public string? Subjective { get; set; }
    public string? Objective { get; set; }
    public string? Assessment { get; set; }
    public string? Plan { get; set; }
}

public class SpecialtyFieldsDataDto
{
    public string? SpecialtyName { get; set; }
    public Dictionary<string, string>? CustomFields { get; set; }
}

public class AISummaryResponseDto
{
    public string Summary { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}

public class AIDiagnosisResponseDto
{
    public string DiagnosticHypothesis { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}

public class AIDataDto
{
    public string? Summary { get; set; }
    public DateTime? SummaryGeneratedAt { get; set; }
    public string? DiagnosticHypothesis { get; set; }
    public DateTime? DiagnosisGeneratedAt { get; set; }
}

public class SaveAIDataDto
{
    public string? Summary { get; set; }
    public string? DiagnosticHypothesis { get; set; }
}
