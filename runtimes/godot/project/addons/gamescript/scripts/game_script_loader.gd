class_name GameScriptLoader
extends RefCounted
## Static utility class for loading GameScript manifests.
##
## The loader is the entry point for the GameScript runtime. It loads the
## manifest.json file which contains locale information and paths to snapshot files.
##
## Example usage:
## [codeblock]
## var manifest = GameScriptLoader.load_manifest()
## var database = manifest.load_database_primary()
## var runner = GameScriptRunner.new(database, settings)
## [/codeblock]


## Load a manifest from the default location (res://GameScript/manifest.json).
static func load_manifest() -> GameScriptManifest:
	return load_manifest_from_path("res://GameScript/manifest.json")


## Load a manifest using paths from a GameScriptSettings resource.
static func load_manifest_from_settings(settings: GameScriptSettings) -> GameScriptManifest:
	var path := "res://%s/manifest.json" % settings.game_data_path
	return load_manifest_from_path(path)


## Load a manifest from a specific file path.
## The path should point to the manifest.json file.
static func load_manifest_from_path(manifest_path: String) -> GameScriptManifest:
	return GameScriptManifest.load_from_path(manifest_path)


## Convenience method: Load manifest + database + create runner in one call.
## Uses the primary locale.
## [codeblock]
## var runner = GameScriptLoader.create_runner(settings)
## runner.start_conversation(conversation_id, listener)
## [/codeblock]
static func create_runner(settings: GameScriptSettings) -> GameScriptRunner:
	var manifest := load_manifest_from_settings(settings)
	if not manifest:
		return null
	var database := manifest.load_database_primary()
	if not database:
		return null
	return GameScriptRunner.new(database, settings)


## Convenience method: Load manifest + database + create runner with specific locale.
## [codeblock]
## var manifest = GameScriptLoader.load_manifest()
## var locale = manifest.find_locale_by_name("es_ES")
## var runner = GameScriptLoader.create_runner_with_locale(manifest, locale, settings)
## [/codeblock]
static func create_runner_with_locale(manifest: GameScriptManifest, locale: LocaleRef, settings: GameScriptSettings) -> GameScriptRunner:
	if not manifest or not locale:
		return null
	var database := manifest.load_database(locale)
	if not database:
		return null
	return GameScriptRunner.new(database, settings)
