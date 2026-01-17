@tool
class_name _GameScriptCommand
extends RefCounted
## Writes command files for IPC with GameScript editor.
##
## When the user clicks the Edit button on an ID property, this writes
## a command.tmp file that the GameScript editor reads to navigate to
## the corresponding entity.

const COMMAND_FILENAME := "command.tmp"


## Entity type constants matching Unity's EntityType class.
class EntityType:
	const CONVERSATION := "conversation"
	const ACTOR := "actor"
	const LOCALIZATION := "localization"
	const LOCALE := "locale"


## Action constants for command files.
class CommandAction:
	const NAVIGATE := "navigate"


## Writes a navigate command to open an entity in GameScript.
static func navigate(entity_type: String, id: int) -> void:
	var settings := _GameScriptEditorDatabase._find_settings()
	if not settings:
		push_warning("GameScript: Cannot open editor - settings not found.")
		return

	var game_data_path := "res://%s" % settings.game_data_path
	var absolute_path := ProjectSettings.globalize_path(game_data_path)

	if absolute_path.is_empty():
		push_warning("GameScript: Cannot open editor - GameDataPath is not configured.")
		return

	if not DirAccess.dir_exists_absolute(absolute_path):
		push_warning("GameScript: Cannot open editor - directory does not exist: %s" % absolute_path)
		return

	# Build the command JSON
	var command := {
		"action": CommandAction.NAVIGATE,
		"type": entity_type,
		"id": id
	}

	var command_path := absolute_path.path_join(COMMAND_FILENAME)
	var json := JSON.stringify(command, "", false)

	var file := FileAccess.open(command_path, FileAccess.WRITE)
	if file:
		file.store_string(json)
		file.close()
		# Launch the configured IDE
		if not settings.ide_executable_path.is_empty():
			OS.create_process(settings.ide_executable_path, [])
	else:
		push_warning("GameScript: Failed to write command file: %s" % command_path)


## Check if the IDE is configured for launching.
static func is_ide_configured() -> bool:
	var settings := _GameScriptEditorDatabase._find_settings()
	if not settings:
		return false
	return not settings.ide_executable_path.is_empty()
