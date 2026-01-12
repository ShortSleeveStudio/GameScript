using System.Text.Json;

namespace GameScript.VisualStudio;

/// <summary>
/// Delegate for message handlers.
/// </summary>
public delegate Task MessageHandlerDelegate(JsonElement message, CancellationToken cancellationToken);

/// <summary>
/// Routes incoming messages to their appropriate handlers.
/// Each handler is registered by message type string.
/// </summary>
public sealed class MessageMediator
{
    private readonly Dictionary<string, MessageHandlerDelegate> _handlers = new();

    /// <summary>
    /// Register a handler for a specific message type.
    /// </summary>
    public void Register(string type, MessageHandlerDelegate handler)
    {
        if (_handlers.ContainsKey(type))
        {
            System.Diagnostics.Debug.WriteLine($"[MessageMediator] Handler for '{type}' already registered, overwriting");
        }
        _handlers[type] = handler;
    }

    /// <summary>
    /// Register multiple handlers at once.
    /// </summary>
    public void RegisterMany(IEnumerable<KeyValuePair<string, MessageHandlerDelegate>> handlers)
    {
        foreach (var (type, handler) in handlers)
        {
            Register(type, handler);
        }
    }

    /// <summary>
    /// Handle an incoming message by routing to the appropriate handler.
    /// </summary>
    public async Task HandleAsync(string type, JsonElement message, CancellationToken cancellationToken)
    {
        if (_handlers.TryGetValue(type, out var handler))
        {
            try
            {
                await handler(message, cancellationToken);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MessageMediator] Handler for '{type}' threw: {ex.Message}");
                throw;
            }
        }
        else
        {
            System.Diagnostics.Debug.WriteLine($"[MessageMediator] No handler registered for message type: {type}");
        }
    }

    /// <summary>
    /// Check if a handler is registered for a message type.
    /// </summary>
    public bool HasHandler(string type) => _handlers.ContainsKey(type);

    /// <summary>
    /// Get all registered message types.
    /// </summary>
    public IEnumerable<string> GetRegisteredTypes() => _handlers.Keys;
}
