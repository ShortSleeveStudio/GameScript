@tool
extends _GameScriptBaseIdInspector
## Inspector plugin for ActorId properties.

const PickerDialog := preload("res://addons/gamescript/editor/actor_picker_dialog.gd")


func _get_resource_script_path() -> String:
	return "res://addons/gamescript/resources/actor_id.gd"


func _get_display_name(id: int) -> String:
	return _GameScriptEditorDatabase.get_actor_name(id)


func _get_entity_type() -> String:
	return _GameScriptCommand.EntityType.ACTOR


func _create_picker_dialog() -> _GameScriptBasePickerDialog:
	return PickerDialog.new()
