using Microsoft.VisualStudio.Extensibility;
using Microsoft.VisualStudio.Extensibility.Commands;

namespace GameScript.VisualStudio.Commands;

/// <summary>
/// GUID constant for the GameScript tool window, used for command activation constraints.
/// Must match the [Guid] attribute on GameScriptToolWindow.
/// </summary>
internal static class ToolWindowGuids
{
    public const string GameScriptToolWindow = "8A3B6F2E-1C4D-4E5F-9A0B-2C3D4E5F6A7B";
}

/// <summary>
/// Undo command that forwards to the WebView UI.
/// Bound to Ctrl+Z when the GameScript tool window is focused.
/// </summary>
[VisualStudioContribution]
public sealed class UndoCommand : Command
{
    private readonly IGameScriptMessageBroker _broker;

    public UndoCommand(VisualStudioExtensibility extensibility, IGameScriptMessageBroker broker)
        : base(extensibility)
    {
        _broker = broker;
    }

    public override CommandConfiguration CommandConfiguration => new("GameScript: Undo")
    {
        Shortcuts = [new CommandShortcut(ModifierKey.Control, Key.Z)],
        EnabledWhen = ActivationConstraint.ClientContext(
            ClientContextKey.Shell.ActiveToolWindowTypeGuid,
            ToolWindowGuids.GameScriptToolWindow)
    };

    public override Task ExecuteCommandAsync(IClientContext context, CancellationToken cancellationToken)
    {
        _broker.PostToWindow("edit:undo");
        return Task.CompletedTask;
    }
}

/// <summary>
/// Redo command that forwards to the WebView UI.
/// Bound to Ctrl+Shift+Z when the GameScript tool window is focused.
/// </summary>
[VisualStudioContribution]
public sealed class RedoCommand : Command
{
    private readonly IGameScriptMessageBroker _broker;

    public RedoCommand(VisualStudioExtensibility extensibility, IGameScriptMessageBroker broker)
        : base(extensibility)
    {
        _broker = broker;
    }

    public override CommandConfiguration CommandConfiguration => new("GameScript: Redo")
    {
        Shortcuts = [
            new CommandShortcut(ModifierKey.ControlShift, Key.Z),
            new CommandShortcut(ModifierKey.Control, Key.Y)
        ],
        EnabledWhen = ActivationConstraint.ClientContext(
            ClientContextKey.Shell.ActiveToolWindowTypeGuid,
            ToolWindowGuids.GameScriptToolWindow)
    };

    public override Task ExecuteCommandAsync(IClientContext context, CancellationToken cancellationToken)
    {
        _broker.PostToWindow("edit:redo");
        return Task.CompletedTask;
    }
}

/// <summary>
/// Save/Export command that forwards to the WebView UI.
/// Bound to Ctrl+S when the GameScript tool window is focused.
/// </summary>
[VisualStudioContribution]
public sealed class SaveCommand : Command
{
    private readonly IGameScriptMessageBroker _broker;

    public SaveCommand(VisualStudioExtensibility extensibility, IGameScriptMessageBroker broker)
        : base(extensibility)
    {
        _broker = broker;
    }

    public override CommandConfiguration CommandConfiguration => new("GameScript: Save/Export")
    {
        Shortcuts = [new CommandShortcut(ModifierKey.Control, Key.S)],
        EnabledWhen = ActivationConstraint.ClientContext(
            ClientContextKey.Shell.ActiveToolWindowTypeGuid,
            ToolWindowGuids.GameScriptToolWindow)
    };

    public override Task ExecuteCommandAsync(IClientContext context, CancellationToken cancellationToken)
    {
        _broker.PostToWindow("edit:save");
        return Task.CompletedTask;
    }
}
