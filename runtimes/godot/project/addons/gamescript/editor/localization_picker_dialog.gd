@tool
class_name _GameScriptLocalizationPickerDialog
extends _GameScriptBasePickerDialog
## Picker dialog for selecting a GameScript localization.


func _get_window_title() -> String:
	return "Select Localization"


func _load_items() -> void:
	_all_items.clear()

	var localizations := _GameScriptEditorDatabase.get_all_localizations()
	for loc in localizations:
		var text := loc.get_text()
		# Truncate long text for display
		if text.length() > 60:
			text = text.substr(0, 57) + "..."

		_all_items.append({
			id = loc.get_id(),
			name = loc.get_name(),
			subtext = text
		})
