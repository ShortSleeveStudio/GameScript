@tool
extends _GameScriptBaseIdInspector
## Inspector plugin for LocaleId properties.

const PickerDialog := preload("res://addons/gamescript/editor/locale_picker_dialog.gd")


func _get_resource_script_path() -> String:
	return "res://addons/gamescript/resources/locale_id.gd"


func _get_display_name(id: int) -> String:
	return _GameScriptEditorDatabase.get_locale_name(id)


func _get_entity_type() -> String:
	return _GameScriptCommand.EntityType.LOCALE


func _create_picker_dialog() -> _GameScriptBasePickerDialog:
	return PickerDialog.new()
