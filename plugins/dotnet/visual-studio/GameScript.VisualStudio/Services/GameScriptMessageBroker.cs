namespace GameScript.VisualStudio;

/// <summary>
/// Message broker for communication between VS Commands and the WebView Tool Window.
/// Registered as a singleton in DI so both commands and the tool window share the same instance.
/// </summary>
public interface IGameScriptMessageBroker
{
    /// <summary>
    /// Event fired when a command requests a message be sent to the WebView.
    /// The tool window subscribes to this event.
    /// </summary>
    event EventHandler<string>? MessageRequested;

    /// <summary>
    /// Post a message to the WebView tool window.
    /// Called by commands to forward keyboard shortcuts, etc.
    /// </summary>
    /// <param name="messageType">The message type (e.g., "edit:undo", "edit:redo", "edit:save")</param>
    void PostToWindow(string messageType);
}

/// <summary>
/// Implementation of the message broker.
/// </summary>
public sealed class GameScriptMessageBroker : IGameScriptMessageBroker
{
    public event EventHandler<string>? MessageRequested;

    public void PostToWindow(string messageType)
    {
        MessageRequested?.Invoke(this, messageType);
    }
}
