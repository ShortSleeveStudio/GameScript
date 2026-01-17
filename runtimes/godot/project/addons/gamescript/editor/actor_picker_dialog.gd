@tool
class_name _GameScriptActorPickerDialog
extends _GameScriptBasePickerDialog
## Picker dialog for selecting a GameScript actor.


func _get_window_title() -> String:
	return "Select Actor"


func _load_items() -> void:
	_all_items.clear()

	var actors := _GameScriptEditorDatabase.get_all_actors()
	for actor in actors:
		_all_items.append({
			id = actor.get_id(),
			name = actor.get_name(),
			subtext = actor.get_localized_name() if actor.get_localized_name() else ""
		})
