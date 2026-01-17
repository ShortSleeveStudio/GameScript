@tool
class_name _GameScriptLocalePickerDialog
extends _GameScriptBasePickerDialog
## Picker dialog for selecting a GameScript locale.


func _get_window_title() -> String:
	return "Select Locale"


func _load_items() -> void:
	_all_items.clear()

	var locales := _GameScriptEditorDatabase.get_all_locales()
	for locale in locales:
		_all_items.append({
			id = locale.get_id(),
			name = locale.get_name(),
			subtext = locale.get_localized_name() if locale.get_localized_name() else ""
		})
