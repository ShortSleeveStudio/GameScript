@tool
class_name _GameScriptConversationPickerDialog
extends _GameScriptBasePickerDialog
## Picker dialog for selecting a GameScript conversation.


func _get_window_title() -> String:
	return "Select Conversation"


func _load_items() -> void:
	_all_items.clear()

	var conversations := _GameScriptEditorDatabase.get_all_conversations()
	for conv in conversations:
		_all_items.append({
			id = conv.get_id(),
			name = conv.get_name(),
			subtext = ""
		})
