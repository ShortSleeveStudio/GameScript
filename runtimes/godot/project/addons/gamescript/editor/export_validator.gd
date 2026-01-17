@tool
class_name _GameScriptExportValidator
extends EditorExportPlugin
## Validates that all nodes with HasCondition or HasAction have corresponding
## GDScript methods before allowing an export to proceed.
##
## This mirrors Unity's GameScriptBuildProcessor behavior.


func _get_name() -> String:
	return "GameScriptExportValidator"


func _export_begin(features: PackedStringArray, is_debug: bool, path: String, flags: int) -> void:
	var errors := _validate()
	if errors.size() > 0:
		var message := "[GameScript] Export validation failed with %d error(s):\n\n" % errors.size()
		for i in range(errors.size()):
			message += "  %d. %s\n" % [i + 1, errors[i]]
		message += "\nAdd the missing methods or remove the condition/action flags from the nodes in GameScript."

		# Push error to Godot's error system - this will show in the Output panel
		push_error(message)

		# Cancel the export by adding an invalid file
		# EditorExportPlugin doesn't have a direct "fail export" method,
		# so we use add_file with invalid data to trigger an error
		add_file("__gamescript_validation_failed__", message.to_utf8_buffer(), false)
	else:
		print("[GameScript] Export validation passed.")


func _validate() -> Array[String]:
	var errors: Array[String] = []

	# Load settings
	var settings := _load_settings()
	if not settings:
		push_warning("[GameScript] No settings found. Skipping export validation. Create a GameScriptSettings resource.")
		return errors

	# Load database
	var database := _load_database(settings)
	if not database:
		push_warning("[GameScript] No snapshot found. Skipping export validation. Export from the GameScript editor first.")
		return errors

	# Build jump tables (mirrors GameScriptRunner logic)
	var node_count := database.get_node_count()
	var conditions: Array = []
	var actions: Array = []
	conditions.resize(node_count)
	actions.resize(node_count)

	# Scan logic folder for methods
	if settings.logic_folder_path != "":
		_scan_logic_folder("res://" + settings.logic_folder_path, database, conditions, actions)

	# Validate each node
	for i in range(node_count):
		var node := database.get_node(i)
		if not node or not node.is_valid():
			continue

		var node_id := node.get_id()
		var conversation_name := _get_conversation_name(database, node)

		if node.get_has_condition() and not _is_valid_callable(conditions[i]):
			errors.append("Node %d in \"%s\" has has_condition=true but no cond_%d() method found." % [node_id, conversation_name, node_id])

		if node.get_has_action() and not _is_valid_callable(actions[i]):
			errors.append("Node %d in \"%s\" has has_action=true but no act_%d() method found." % [node_id, conversation_name, node_id])

	return errors


func _load_settings() -> GameScriptSettings:
	# Try the standard location first
	var settings_path := "res://addons/gamescript/settings.tres"
	if ResourceLoader.exists(settings_path):
		return load(settings_path) as GameScriptSettings
	return null


func _load_database(settings: GameScriptSettings) -> GameScriptDatabase:
	var manifest := GameScriptLoader.load_manifest_from_settings(settings)
	if not manifest:
		return null

	var database := manifest.load_database_primary()
	if not database:
		return null

	return database


func _scan_logic_folder(path: String, database: GameScriptDatabase, conditions: Array, actions: Array) -> void:
	var scripts := _get_all_scripts_recursive(path)
	for script_path in scripts:
		var script := load(script_path)
		if script:
			var provider = script.new()
			_scan_and_bind_methods(provider, database, conditions, actions)


func _get_all_scripts_recursive(path: String) -> Array[String]:
	var result: Array[String] = []
	var dir := DirAccess.open(path)
	if dir:
		dir.list_dir_begin()
		var file_name := dir.get_next()
		while file_name != "":
			var full_path := path.path_join(file_name)
			if dir.current_is_dir() and not file_name.begins_with("."):
				result.append_array(_get_all_scripts_recursive(full_path))
			elif file_name.ends_with(".gd"):
				result.append(full_path)
			file_name = dir.get_next()
		dir.list_dir_end()
	return result


func _scan_and_bind_methods(provider: Object, database: GameScriptDatabase, conditions: Array, actions: Array) -> void:
	for method in provider.get_method_list():
		var m_name: String = method["name"]

		# Convention: cond_{node_id}
		if m_name.begins_with("cond_"):
			var node_id := m_name.substr(5).to_int()
			var node_index := database.get_node_index(node_id)
			if node_index >= 0 and node_index < conditions.size():
				conditions[node_index] = Callable(provider, m_name)

		# Convention: act_{node_id}
		elif m_name.begins_with("act_"):
			var node_id := m_name.substr(4).to_int()
			var node_index := database.get_node_index(node_id)
			if node_index >= 0 and node_index < actions.size():
				actions[node_index] = Callable(provider, m_name)


func _is_valid_callable(value) -> bool:
	return value is Callable and value.is_valid()


func _get_conversation_name(database: GameScriptDatabase, node: NodeRef) -> String:
	var conv := node.get_conversation()
	if conv and conv.is_valid():
		return conv.get_name()
	return "<unknown>"
