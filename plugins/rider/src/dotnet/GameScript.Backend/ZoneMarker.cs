using JetBrains.Application.BuildScript.Application.Zones;
using JetBrains.Rider.Model;

namespace GameScript.Backend
{
    /// <summary>
    /// Zone marker for the GameScript backend component.
    /// This tells the ReSharper backend: "I am a Rider-compatible plugin".
    ///
    /// Without IRequire&lt;IRiderModelZone&gt;, the backend will find the DLL
    /// but refuse to load its components (to prevent loading Visual Studio-only
    /// components on macOS/Linux).
    /// </summary>
    [ZoneMarker]
    public class ZoneMarker : IRequire<IRiderModelZone>
    {
    }
}
