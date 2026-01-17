@tool
class_name _GameScriptBaseIdInspector
extends EditorInspectorPlugin
## Base class for GameScript ID property inspector plugins.
##
## Provides a custom editor for ID types with:
## - Name display field showing the selected entity's name
## - Edit button (pencil icon) to open the entity in GameScript editor
## - Picker button (...) to open selection dialog
## - Clear button (x) to reset to no selection
##
## Subclasses specify the resource type to handle and create the appropriate picker.


## Return the script path for the resource this inspector handles.
func _get_resource_script_path() -> String:
	return ""


## Get the display name for the given ID value.
func _get_display_name(id: int) -> String:
	return ""


## Get the entity type for IPC commands (e.g., "conversation", "actor").
## Must match _GameScriptCommand.EntityType constants.
func _get_entity_type() -> String:
	return ""


## Create and return a new picker dialog instance.
func _create_picker_dialog() -> _GameScriptBasePickerDialog:
	return null


func _can_handle(object: Object) -> bool:
	if not object is Resource:
		return false

	# Check if the object's script matches our target
	var script := object.get_script()
	if script:
		var script_path: String = script.resource_path
		return script_path == _get_resource_script_path()

	return false


func _parse_property(object: Object, type: Variant.Type, name: String, hint_type: PropertyHint, hint_string: String, usage_flags: int, wide: bool) -> bool:
	if name == "value" and object is Resource:
		var control := _GameScriptIdPropertyEditor.new()
		control.setup(self, object)
		add_property_editor(name, control)
		return true
	return false


## Internal property editor control.
class _GameScriptIdPropertyEditor extends EditorProperty:
	var _inspector: _GameScriptBaseIdInspector
	var _resource: Resource

	var _container: HBoxContainer
	var _name_label: Label
	var _edit_button: Button
	var _picker_button: Button
	var _clear_button: Button
	var _picker_dialog: _GameScriptBasePickerDialog


	func setup(inspector: _GameScriptBaseIdInspector, resource: Resource) -> void:
		_inspector = inspector
		_resource = resource


	func _ready() -> void:
		_build_ui()
		_update_display()


	func _build_ui() -> void:
		_container = HBoxContainer.new()
		_container.add_theme_constant_override("separation", 4)
		add_child(_container)

		# Name display label with background styling
		var label_panel := PanelContainer.new()
		label_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_container.add_child(label_panel)

		_name_label = Label.new()
		_name_label.clip_text = true
		_name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		label_panel.add_child(_name_label)

		# Edit button (opens in GameScript editor)
		_edit_button = Button.new()
		_edit_button.text = "✎"
		_edit_button.tooltip_text = "Edit in GameScript"
		_edit_button.custom_minimum_size = Vector2(24, 0)
		_edit_button.pressed.connect(_on_edit_pressed)
		_container.add_child(_edit_button)

		# Picker button
		_picker_button = Button.new()
		_picker_button.text = "..."
		_picker_button.tooltip_text = "Select"
		_picker_button.custom_minimum_size = Vector2(24, 0)
		_picker_button.pressed.connect(_on_picker_pressed)
		_container.add_child(_picker_button)

		# Clear button
		_clear_button = Button.new()
		_clear_button.text = "x"
		_clear_button.tooltip_text = "Clear"
		_clear_button.custom_minimum_size = Vector2(24, 0)
		_clear_button.pressed.connect(_on_clear_pressed)
		_container.add_child(_clear_button)


	func _update_display() -> void:
		var id: int = _resource.value if _resource else 0
		var has_value := id != 0

		if has_value:
			var display_name := _inspector._get_display_name(id)
			if display_name.is_empty():
				_name_label.text = "(Missing: %d)" % id
			else:
				_name_label.text = display_name
		else:
			_name_label.text = "(None)"

		# Show edit when has value, picker when no value
		var ide_configured := _GameScriptCommand.is_ide_configured()
		_edit_button.visible = has_value
		_edit_button.disabled = not ide_configured
		_edit_button.tooltip_text = "Edit in GameScript" if ide_configured else "Configure ide_executable_path in GameScriptSettings to enable"
		_picker_button.visible = not has_value
		_clear_button.visible = has_value


	func _on_edit_pressed() -> void:
		var id: int = _resource.value if _resource else 0
		if id != 0:
			var entity_type := _inspector._get_entity_type()
			if not entity_type.is_empty():
				_GameScriptCommand.navigate(entity_type, id)


	func _on_picker_pressed() -> void:
		if not _picker_dialog:
			_picker_dialog = _inspector._create_picker_dialog()
			if _picker_dialog:
				_picker_dialog.item_selected.connect(_on_item_selected)
				# Add dialog to editor base control so it's not clipped
				EditorInterface.get_base_control().add_child(_picker_dialog)

		if _picker_dialog:
			var button_rect := _picker_button.get_global_rect()
			var position := Vector2i(int(button_rect.position.x), int(button_rect.end.y))
			var current_value: int = _resource.value if _resource else 0
			_picker_dialog.show_picker(position, current_value)


	func _on_clear_pressed() -> void:
		_set_value(0)


	func _on_item_selected(id: int) -> void:
		_set_value(id)


	func _set_value(id: int) -> void:
		if _resource:
			_resource.value = id
			emit_changed("value", id)
			_update_display()


	func _update_property() -> void:
		_update_display()


	func _exit_tree() -> void:
		if _picker_dialog:
			_picker_dialog.queue_free()
			_picker_dialog = null
