using Microsoft.VisualStudio.Extensibility;

namespace GameScript.VisualStudio;

/// <summary>
/// Extension entrypoint for the GameScript Visual Studio extension.
/// This is the main entry point for the out-of-process extensibility model.
/// </summary>
[VisualStudioContribution]
public sealed class ExtensionEntrypoint : Extension
{
    /// <inheritdoc />
    public override ExtensionConfiguration ExtensionConfiguration => new()
    {
        Metadata = new ExtensionMetadata(
            id: "GameScript.VisualStudio",
            version: ExtensionAssemblyVersion,
            publisherName: "Short Sleeve Studio",
            displayName: "GameScript",
            description: "Visual dialogue authoring system for game developers"
        ),
    };

    /// <inheritdoc />
    protected override void InitializeServices(IServiceCollection serviceCollection)
    {
        base.InitializeServices(serviceCollection);

        // Register services for dependency injection
        serviceCollection.AddSingleton<MessageMediator>();
        serviceCollection.AddSingleton<DatabaseManager>();
        serviceCollection.AddSingleton<ThemeManager>();
        serviceCollection.AddSingleton<CodeAnalyzerService>();
        serviceCollection.AddSingleton<FileWatcherService>();
        serviceCollection.AddSingleton<IGameScriptMessageBroker, GameScriptMessageBroker>();
    }
}
