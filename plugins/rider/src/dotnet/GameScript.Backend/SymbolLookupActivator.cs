using JetBrains.Application.Parts;
using JetBrains.ProjectModel;

namespace GameScript.Backend
{
    /// <summary>
    /// Activator component that forces <see cref="SymbolLookupHost"/> to be instantiated
    /// when the solution container is composed.
    ///
    /// In ReSharper SDK 2024.3+, all components use lazy (Demand*) instantiation by default.
    /// Protocol hosts like SymbolLookupHost need to be created eagerly so their RPC handlers
    /// are registered before the Kotlin frontend tries to call them.
    ///
    /// Using <see cref="Instantiation.ContainerAsyncPrimaryThread"/> tells the component container:
    /// "As soon as this container (the Solution container) is composed, create this instance
    /// immediately." By injecting SymbolLookupHost directly (not Lazy), the container is
    /// forced to instantiate it as a dependency.
    /// </summary>
    [SolutionComponent(Instantiation.ContainerAsyncPrimaryThread)]
    public class SymbolLookupActivator
    {
        // ReSharper disable once UnusedParameter.Local - injection forces instantiation
        public SymbolLookupActivator(SymbolLookupHost host)
        {
            // The host is now instantiated and its RPC handlers are registered
            // via its constructor. No additional work needed here.
        }
    }
}
