@tool
class_name _GameScriptEditorDatabase
extends RefCounted
## Editor-only singleton for accessing GameScript data in property drawers and pickers.
##
## This class provides lazy-loaded, cached access to the manifest and database
## for use in the Godot editor. It handles hot-reloading when the snapshot changes.
##
## NOTE: This class is prefixed with underscore to indicate internal use.
## Users should not interact with this class directly.

# Singleton instance
static var _instance: _GameScriptEditorDatabase
static var _settings_path: String

# Cached data
var _manifest: GameScriptManifest
var _database: GameScriptDatabase
var _last_check_time: int = 0
var _current_locale_hash: String = ""

# How often to check for hot-reload (in milliseconds)
const HOT_RELOAD_CHECK_INTERVAL_MS := 1000


## Get the shared editor database instance.
## Returns null if settings are not configured or data files don't exist.
static func get_instance() -> _GameScriptEditorDatabase:
	_ensure_instance()
	return _instance


## Get the current database for editor use.
## Returns null if not available.
static func get_database() -> GameScriptDatabase:
	_ensure_instance()
	if _instance:
		return _instance._database
	return null


## Get the current manifest for editor use.
## Returns null if not available.
static func get_manifest() -> GameScriptManifest:
	_ensure_instance()
	if _instance:
		return _instance._manifest
	return null


## Clear the cached instance (called when plugin unloads).
static func clear() -> void:
	_instance = null
	_settings_path = ""


## Get the display name for a conversation by ID.
static func get_conversation_name(id: int) -> String:
	var db := get_database()
	if not db:
		return ""
	var conv := db.find_conversation(id)
	if conv and conv.is_valid():
		return conv.get_name()
	return ""


## Get the display name for an actor by ID.
static func get_actor_name(id: int) -> String:
	var db := get_database()
	if not db:
		return ""
	var actor := db.find_actor(id)
	if actor and actor.is_valid():
		return actor.get_name()
	return ""


## Get the display name for a locale by ID.
static func get_locale_name(id: int) -> String:
	var manifest := get_manifest()
	if not manifest:
		return ""
	var locale := manifest.find_locale(id)
	if locale and locale.is_valid():
		return locale.get_name()
	return ""


## Get the display name for a localization by ID.
static func get_localization_name(id: int) -> String:
	var db := get_database()
	if not db:
		return ""
	var loc := db.find_localization(id)
	if loc and loc.is_valid():
		return loc.get_name()
	return ""


## Get all conversations for picker display.
static func get_all_conversations() -> Array[ConversationRef]:
	var result: Array[ConversationRef] = []
	var db := get_database()
	if not db:
		return result
	var count := db.get_conversation_count()
	for i in range(count):
		var conv := db.get_conversation(i)
		if conv and conv.is_valid():
			result.append(conv)
	return result


## Get all actors for picker display.
static func get_all_actors() -> Array[ActorRef]:
	var result: Array[ActorRef] = []
	var db := get_database()
	if not db:
		return result
	var count := db.get_actor_count()
	for i in range(count):
		var actor := db.get_actor(i)
		if actor and actor.is_valid():
			result.append(actor)
	return result


## Get all locales for picker display.
static func get_all_locales() -> Array[LocaleRef]:
	var result: Array[LocaleRef] = []
	var manifest := get_manifest()
	if not manifest:
		return result
	var count := manifest.get_locale_count()
	for i in range(count):
		var locale := manifest.get_locale(i)
		if locale and locale.is_valid():
			result.append(locale)
	return result


## Get all localizations for picker display.
static func get_all_localizations() -> Array[LocalizationRef]:
	var result: Array[LocalizationRef] = []
	var db := get_database()
	if not db:
		return result
	var count := db.get_localization_count()
	for i in range(count):
		var loc := db.get_localization(i)
		if loc and loc.is_valid():
			result.append(loc)
	return result


# Internal: Ensure the singleton is initialized
static func _ensure_instance() -> void:
	# Find settings - look for a .tres file that is a GameScriptSettings
	var settings := _find_settings()
	if not settings:
		_instance = null
		_settings_path = ""
		return

	var current_path := settings.game_data_path

	# Check if settings path changed - invalidate cache
	if _instance and _settings_path != current_path:
		_instance = null
		_settings_path = ""

	# Create new instance if needed
	if not _instance:
		_instance = _GameScriptEditorDatabase.new()
		_settings_path = current_path

	# Load manifest and database if not loaded
	if not _instance._manifest:
		_instance._load_data(settings)

	# Check for hot-reload (only when not playing)
	if not Engine.is_editor_hint() or EditorInterface.is_playing_scene():
		return

	var current_time := Time.get_ticks_msec()
	if current_time - _instance._last_check_time > HOT_RELOAD_CHECK_INTERVAL_MS:
		_instance._last_check_time = current_time
		_instance._check_hot_reload(settings)


# Internal: Find GameScriptSettings resource
static func _find_settings() -> GameScriptSettings:
	# Look for settings in common locations
	var paths := [
		"res://gamescript_settings.tres",
		"res://addons/gamescript/settings.tres",
		"res://resources/gamescript_settings.tres",
	]

	for path in paths:
		if ResourceLoader.exists(path):
			var resource := ResourceLoader.load(path)
			if resource is GameScriptSettings:
				return resource

	# Also check project settings for a custom path
	if ProjectSettings.has_setting("gamescript/settings_path"):
		var custom_path: String = ProjectSettings.get_setting("gamescript/settings_path")
		if ResourceLoader.exists(custom_path):
			var resource := ResourceLoader.load(custom_path)
			if resource is GameScriptSettings:
				return resource

	return null


# Load manifest and database from settings
func _load_data(settings: GameScriptSettings) -> void:
	var manifest_path := "res://%s/manifest.json" % settings.game_data_path

	if not FileAccess.file_exists(manifest_path):
		_manifest = null
		_database = null
		_current_locale_hash = ""
		return

	_manifest = GameScriptManifest.load_from_path(manifest_path)
	if not _manifest:
		_database = null
		_current_locale_hash = ""
		return

	_database = _manifest.load_database_primary()

	# Store the hash of the current locale for hot-reload detection
	var primary_locale := _manifest.get_primary_locale()
	if primary_locale and primary_locale.is_valid():
		_current_locale_hash = primary_locale.get_hash()
	else:
		_current_locale_hash = ""


# Check if snapshot has changed and reload if needed
func _check_hot_reload(settings: GameScriptSettings) -> void:
	# If we don't have data loaded, try to load it
	if not _manifest or not _database:
		_load_data(settings)
		return

	# Reload the manifest to get the latest hash (manifest.json is small)
	var manifest_path := "res://%s/manifest.json" % settings.game_data_path
	if not FileAccess.file_exists(manifest_path):
		return

	var fresh_manifest := GameScriptManifest.load_from_path(manifest_path)
	if not fresh_manifest:
		return

	# Compare the primary locale's hash to detect changes
	var primary_locale := fresh_manifest.get_primary_locale()
	if not primary_locale or not primary_locale.is_valid():
		return

	var new_hash: String = primary_locale.get_hash()
	if new_hash != _current_locale_hash:
		# Hash changed - snapshot was re-exported, reload everything
		_manifest = fresh_manifest
		_database = _manifest.load_database_primary()
		_current_locale_hash = new_hash
