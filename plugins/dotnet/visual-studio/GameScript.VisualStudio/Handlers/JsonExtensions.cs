using System.Text.Json;

namespace GameScript.VisualStudio;

/// <summary>
/// Extension methods for JsonElement to simplify message parsing.
/// </summary>
public static class JsonExtensions
{
    /// <summary>
    /// Get a required string property.
    /// </summary>
    public static string GetRequiredString(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            throw new ArgumentException($"Missing required property: {propertyName}");
        }
        return prop.GetString() ?? throw new ArgumentException($"Property '{propertyName}' is null");
    }

    /// <summary>
    /// Get an optional string property.
    /// </summary>
    public static string? GetOptionalString(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        return prop.ValueKind == JsonValueKind.Null ? null : prop.GetString();
    }

    /// <summary>
    /// Get a required integer property.
    /// </summary>
    public static int GetRequiredInt(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            throw new ArgumentException($"Missing required property: {propertyName}");
        }
        return prop.GetInt32();
    }

    /// <summary>
    /// Get an optional integer property.
    /// </summary>
    public static int? GetOptionalInt(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        return prop.ValueKind == JsonValueKind.Null ? null : prop.GetInt32();
    }

    /// <summary>
    /// Get a required long property.
    /// </summary>
    public static long GetRequiredLong(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            throw new ArgumentException($"Missing required property: {propertyName}");
        }
        return prop.GetInt64();
    }

    /// <summary>
    /// Get an optional long property.
    /// </summary>
    public static long? GetOptionalLong(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        return prop.ValueKind == JsonValueKind.Null ? null : prop.GetInt64();
    }

    /// <summary>
    /// Get a required boolean property.
    /// </summary>
    public static bool GetRequiredBool(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            throw new ArgumentException($"Missing required property: {propertyName}");
        }
        return prop.GetBoolean();
    }

    /// <summary>
    /// Get an optional boolean property.
    /// </summary>
    public static bool? GetOptionalBool(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        return prop.ValueKind == JsonValueKind.Null ? null : prop.GetBoolean();
    }

    /// <summary>
    /// Get an optional array property as a list of objects.
    /// </summary>
    public static List<object?>? GetOptionalArray(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        if (prop.ValueKind != JsonValueKind.Array)
        {
            return null;
        }
        return prop.EnumerateArray().Select(e => ConvertToObject(e)).ToList();
    }

    /// <summary>
    /// Get an optional array property as a list of strings.
    /// </summary>
    public static List<string>? GetOptionalStringArray(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        if (prop.ValueKind != JsonValueKind.Array)
        {
            return null;
        }
        return prop.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString()!)
            .ToList();
    }

    /// <summary>
    /// Get a nested object property.
    /// </summary>
    public static JsonElement? GetOptionalObject(this JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }
        return prop.ValueKind == JsonValueKind.Object ? prop : null;
    }

    /// <summary>
    /// Convert a JsonElement to a .NET object.
    /// </summary>
    public static object? ConvertToObject(this JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Null => null,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out var l) => l,
            JsonValueKind.Number => element.GetDouble(),
            JsonValueKind.Array => element.EnumerateArray().Select(e => ConvertToObject(e)).ToList(),
            JsonValueKind.Object => element.EnumerateObject().ToDictionary(p => p.Name, p => ConvertToObject(p.Value)),
            _ => element.GetRawText()
        };
    }

    /// <summary>
    /// Convert a JsonElement array to a list of parameter values for SQL.
    /// </summary>
    public static List<object?> ToParameterList(this JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Array)
        {
            return new List<object?>();
        }
        return element.EnumerateArray().Select(e => ConvertToObject(e)).ToList();
    }
}

/// <summary>
/// File system helper methods.
/// </summary>
public static class FileHelpers
{
    /// <summary>
    /// Ensures the parent directory of a file path exists.
    /// Creates the directory if it doesn't exist.
    /// </summary>
    public static void EnsureDirectoryExists(string filePath)
    {
        string? directory = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }
    }
}
