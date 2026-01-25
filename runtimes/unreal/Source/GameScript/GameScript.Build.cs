using UnrealBuildTool;
using System.IO;

public class GameScript : ModuleRules
{
	public GameScript(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"GameplayTasks",
			"DeveloperSettings",
			"Json"
		});

		// FlatBuffers include path (PRIVATE - not exposed to plugin users)
		// The plugin ships with FlatBuffers headers and generated code already included.
		// Game developers do not need to compile the schema - this is done by package maintainers.
		// Using PrivateIncludePaths ensures FlatBuffers types don't pollute the global namespace.
		string FlatBuffersPath = Path.Combine(ModuleDirectory, "../../ThirdParty/flatbuffers/include");
		PrivateIncludePaths.Add(FlatBuffersPath);
	}
}
