using UnrealBuildTool;

public class GameScriptEditor : ModuleRules
{
	public GameScriptEditor(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"GameScript",      // Runtime module
			"Core",
			"CoreUObject",
			"Engine",
			"UnrealEd",
			"Slate",
			"SlateCore",
			"EditorStyle",
			"PropertyEditor",
			"ToolMenus",
			"LevelEditor",     // For menu integration
			"JsonUtilities",   // For JSON serialization
			"InputCore",       // For EKeys constants
			"SourceCodeAccess" // For IDE launching
		});
	}
}
