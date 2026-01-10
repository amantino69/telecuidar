namespace Domain.Enums;

public enum AppointmentStatus
{
    Scheduled,
    Confirmed,
    InProgress,
    Completed,
    Cancelled
}

public enum AppointmentType
{
    FirstVisit,
    Return,
    Routine,
    Emergency,
    Common,
    Referral
}
