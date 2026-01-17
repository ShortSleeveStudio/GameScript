@tool
class_name _GameScriptBasePickerDialog
extends ConfirmationDialog
## Base class for GameScript picker dialogs.
##
## Provides common UI structure: search field + virtualized item list.
## Uses manual virtualization pattern to handle hundreds of thousands of items.
## Subclasses implement item loading, filtering, and display.

signal item_selected(id: int)

const ITEM_HEIGHT := 24
const WINDOW_SIZE := Vector2i(400, 450)
const POOL_BUFFER := 4  # Extra items above/below visible area

var _current_value: int = 0
var _search_text: String = ""
var _selected_index: int = -1

# UI elements
var _search_field: LineEdit
var _scroll_container: ScrollContainer
var _content: Control  # Sets total scrollable height
var _pool_container: VBoxContainer  # Holds the pooled labels
var _item_pool: Array[Control] = []

# Data
var _all_items: Array = []  # Array of dictionaries: {id: int, name: String, subtext: String}
var _filtered_items: Array = []
var _ui_built: bool = false
var _visible_count: int = 0
var _selected_style: StyleBox  # Cached to avoid GC during scroll
var _normal_style: StyleBox  # Consistent sizing when not selected


func _init() -> void:
	title = _get_window_title()
	size = WINDOW_SIZE
	unresizable = false


func _ready() -> void:
	# Connect dialog signals
	confirmed.connect(_on_confirmed)
	canceled.connect(_on_canceled)

	# Build UI now that we're in the tree
	_ensure_styles_created()
	_ensure_ui_built()

	# Load data
	_load_items()
	_filter_items()
	_update_virtual_list()


func _ensure_styles_created() -> void:
	if not is_instance_valid(_selected_style):
		_selected_style = _create_selected_style()
	if not is_instance_valid(_normal_style):
		_normal_style = _create_normal_style()


func _ensure_ui_built() -> void:
	if _ui_built:
		return
	_ui_built = true

	# Create a container for our content
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	add_child(vbox)

	# Position it to fill the dialog content area (above the buttons)
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.offset_bottom = -50  # Leave room for OK/Cancel buttons

	# Search field
	_search_field = LineEdit.new()
	_search_field.placeholder_text = "Search..."
	_search_field.clear_button_enabled = true
	_search_field.text_changed.connect(_on_search_changed)
	_search_field.gui_input.connect(_on_search_input)
	vbox.add_child(_search_field)

	# Scroll container for virtualized list
	_scroll_container = ScrollContainer.new()
	_scroll_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll_container.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	vbox.add_child(_scroll_container)

	# Content control - sets total scrollable height
	# ScrollContainer requires its child to set anchor_right to define width
	_content = Control.new()
	_content.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll_container.add_child(_content)

	# Pool container - holds visible items, repositioned on scroll
	# Anchor to full width of content, positioned via position.y during scroll
	_pool_container = VBoxContainer.new()
	_pool_container.add_theme_constant_override("separation", 0)
	_pool_container.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_content.add_child(_pool_container)

	# Connect scroll signal
	_scroll_container.get_v_scroll_bar().value_changed.connect(_on_scroll)

	# Calculate how many items fit in the visible area
	# Dialog content area is roughly WINDOW_SIZE.y - 50 (buttons) - 40 (search field + spacing)
	var visible_height: int = WINDOW_SIZE.y - 50 - 40
	_visible_count = ceili(float(visible_height) / ITEM_HEIGHT) + POOL_BUFFER * 2

	# Create the pool of item controls
	for i in range(_visible_count):
		var item_control := _create_pool_item()
		_pool_container.add_child(item_control)
		_item_pool.append(item_control)


func _create_pool_item() -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(0, ITEM_HEIGHT)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var label := Label.new()
	label.name = "Label"
	label.clip_text = true
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_child(label)

	# Make clickable
	panel.gui_input.connect(_on_pool_item_input.bind(panel))
	panel.mouse_entered.connect(_on_pool_item_hover.bind(panel))

	return panel


func _on_pool_item_input(event: InputEvent, panel: Control) -> void:
	if event is InputEventMouseButton and event.pressed:
		var index: int = panel.get_meta("data_index", -1)
		if index >= 0:
			if event.button_index == MOUSE_BUTTON_LEFT:
				_select_index(index)
				if event.double_click:
					_confirm_selection()


func _on_pool_item_hover(panel: Control) -> void:
	# Optional: highlight on hover
	pass


func _select_index(index: int) -> void:
	_selected_index = index
	_update_selection_visuals()


func _update_selection_visuals() -> void:
	for item in _item_pool:
		var data_index: int = item.get_meta("data_index", -1)
		var is_selected := data_index == _selected_index
		# Use consistent styles for selection to avoid size changes
		if is_selected:
			item.add_theme_stylebox_override("panel", _selected_style)
		else:
			item.add_theme_stylebox_override("panel", _normal_style)


func _create_selected_style() -> StyleBox:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.3, 0.5, 0.8, 0.5)
	return style


func _create_normal_style() -> StyleBox:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0)
	return style


func _on_search_changed(new_text: String) -> void:
	_search_text = new_text.to_lower()
	_selected_index = -1
	_filter_items()
	_update_virtual_list()


func _on_scroll(value: float) -> void:
	_update_visible_items(value)


func _on_confirmed() -> void:
	_confirm_selection()


func _on_canceled() -> void:
	hide()


func _on_search_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_UP:
				_move_selection(-1)
				get_viewport().set_input_as_handled()
			KEY_DOWN:
				_move_selection(1)
				get_viewport().set_input_as_handled()
			KEY_ENTER, KEY_KP_ENTER:
				_confirm_selection()
				get_viewport().set_input_as_handled()


func _move_selection(delta: int) -> void:
	if _filtered_items.is_empty():
		return

	var new_index: int
	if _selected_index < 0:
		new_index = 0 if delta > 0 else _filtered_items.size() - 1
	else:
		new_index = clampi(_selected_index + delta, 0, _filtered_items.size() - 1)

	_select_index(new_index)
	_ensure_index_visible(new_index)


func _ensure_index_visible(index: int) -> void:
	var target_y := index * ITEM_HEIGHT
	var scroll_bar := _scroll_container.get_v_scroll_bar()
	var visible_height := _scroll_container.size.y

	if target_y < scroll_bar.value:
		scroll_bar.value = target_y
	elif target_y + ITEM_HEIGHT > scroll_bar.value + visible_height:
		scroll_bar.value = target_y + ITEM_HEIGHT - visible_height


func _confirm_selection() -> void:
	# Auto-select single result if nothing selected
	if _selected_index < 0 and _filtered_items.size() == 1:
		_selected_index = 0

	if _selected_index < 0 or _selected_index >= _filtered_items.size():
		hide()
		return

	var item: Dictionary = _filtered_items[_selected_index]
	item_selected.emit(item.id)
	hide()


func _filter_items() -> void:
	_filtered_items.clear()

	# Add None option first if enabled
	if _include_none_option():
		if _search_text.is_empty() or "(none)".contains(_search_text):
			_filtered_items.append({id = 0, name = "(None)", subtext = ""})

	# Filter items
	for item in _all_items:
		if _matches_filter(item):
			_filtered_items.append(item)


func _update_virtual_list() -> void:
	if not _content:
		return

	# Set total content height
	var total_height := _filtered_items.size() * ITEM_HEIGHT
	_content.custom_minimum_size = Vector2(0, total_height)

	# Reset scroll position
	_scroll_container.get_v_scroll_bar().value = 0

	# Update visible items
	_update_visible_items(0)

	# Auto-select current value if present
	for i in range(_filtered_items.size()):
		if _filtered_items[i].id == _current_value:
			_select_index(i)
			_ensure_index_visible(i)
			break


func _update_visible_items(scroll_pos: float) -> void:
	var start_index := maxi(0, int(scroll_pos / ITEM_HEIGHT) - POOL_BUFFER)
	var end_index := mini(_filtered_items.size(), start_index + _visible_count)

	# Position pool container
	_pool_container.position.y = start_index * ITEM_HEIGHT

	# Update pool items
	for i in range(_item_pool.size()):
		var data_index := start_index + i
		var item := _item_pool[i]

		if data_index < end_index and data_index < _filtered_items.size():
			var data: Dictionary = _filtered_items[data_index]
			var label: Label = item.get_node("Label")

			var display_text: String = data.name
			if not data.subtext.is_empty():
				display_text += " - " + data.subtext
			label.text = display_text

			item.set_meta("data_index", data_index)
			item.visible = true

			# Update selection visual
			var is_selected := data_index == _selected_index
			if is_selected:
				item.add_theme_stylebox_override("panel", _selected_style)
			else:
				item.add_theme_stylebox_override("panel", _normal_style)
		else:
			item.visible = false
			item.set_meta("data_index", -1)


func _matches_filter(item: Dictionary) -> bool:
	if _search_text.is_empty():
		return true

	var name_match: bool = item.name.to_lower().contains(_search_text)
	var subtext_match: bool = false
	if not item.subtext.is_empty():
		subtext_match = item.subtext.to_lower().contains(_search_text)

	return name_match or subtext_match


## Show the picker dialog at the given position.
func show_picker(position: Vector2i, current_value: int) -> void:
	_current_value = current_value
	_selected_index = -1

	# Ensure UI is built (may not have _ready called yet if just added to tree)
	_ensure_styles_created()
	_ensure_ui_built()

	# Reload and refresh the list each time we show
	_load_items()
	_filter_items()
	_update_virtual_list()

	# Focus search and show
	if _search_field:
		_search_field.text = ""
		_search_field.grab_focus()

	popup_centered()

	# Position near the button if possible
	if position != Vector2i.ZERO:
		var screen_rect := DisplayServer.screen_get_usable_rect()
		var dialog_pos := position
		# Ensure dialog stays on screen
		if dialog_pos.x + size.x > screen_rect.end.x:
			dialog_pos.x = screen_rect.end.x - size.x
		if dialog_pos.y + size.y > screen_rect.end.y:
			dialog_pos.y = screen_rect.end.y - size.y
		# Clamp each component separately
		var min_pos := screen_rect.position
		var max_pos := screen_rect.end - Vector2i(size)
		dialog_pos.x = clampi(dialog_pos.x, min_pos.x, max_pos.x)
		dialog_pos.y = clampi(dialog_pos.y, min_pos.y, max_pos.y)
		self.position = dialog_pos


# Virtual methods for subclasses to override

## Return the window title for this picker.
func _get_window_title() -> String:
	return "Select Item"


## Return true to include a "(None)" option at the top of the list.
func _include_none_option() -> bool:
	return true


## Load all items from the database. Subclasses must implement this.
func _load_items() -> void:
	pass
