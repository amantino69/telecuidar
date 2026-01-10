using System.Text.Json;

namespace WebAPI.Extensions;

public static class HttpContextExtensions
{
    public static string? GetIpAddress(this HttpContext httpContext)
    {
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
        
        // Check for forwarded IP (common in proxy/load balancer scenarios)
        if (httpContext.Request.Headers.ContainsKey("X-Forwarded-For"))
        {
            ipAddress = httpContext.Request.Headers["X-Forwarded-For"].ToString().Split(',').FirstOrDefault()?.Trim();
        }
        else if (httpContext.Request.Headers.ContainsKey("X-Real-IP"))
        {
            ipAddress = httpContext.Request.Headers["X-Real-IP"].ToString();
        }

        return ipAddress;
    }

    public static string? GetUserAgent(this HttpContext httpContext)
    {
        return httpContext.Request.Headers.UserAgent.ToString();
    }

    public static string SerializeToJson(object? obj)
    {
        if (obj == null) return "null";
        
        return JsonSerializer.Serialize(obj, new JsonSerializerOptions
        {
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
    }

    public static string GetDifferences(object? oldValues, object? newValues)
    {
        if (oldValues == null || newValues == null)
            return SerializeToJson(newValues);

        var oldDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(SerializeToJson(oldValues));
        var newDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(SerializeToJson(newValues));

        if (oldDict == null || newDict == null)
            return SerializeToJson(newValues);

        var changes = new Dictionary<string, object>();
        
        foreach (var key in newDict.Keys)
        {
            if (!oldDict.ContainsKey(key))
            {
                changes[key] = new { New = newDict[key] };
            }
            else if (!JsonElement.DeepEquals(oldDict[key], newDict[key]))
            {
                changes[key] = new { Old = oldDict[key], New = newDict[key] };
            }
        }

        return changes.Count > 0 ? SerializeToJson(changes) : "{}";
    }
}
