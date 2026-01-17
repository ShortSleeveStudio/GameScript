extends Control
## Main test rig for manually testing GameScript conversations.

const ConversationUIScene := preload("res://test/conversation_ui.tscn")

@export var settings: GameScriptSettings
@export var conversation_dropdown: OptionButton
@export var locale_dropdown: OptionButton
@export var conversation_container: HBoxContainer

var _runner: GameScriptRunner
var _manifest: GameScriptManifest


func _ready() -> void:
	# Load manifest and create runner
	_manifest = GameScriptLoader.load_manifest_from_settings(settings)
	if not _manifest:
		push_error("Failed to load GameScript manifest")
		return

	var database := _manifest.load_database_primary()
	if not database:
		push_error("Failed to load GameScript database")
		return

	_runner = GameScriptRunner.new(database, settings)

	# Populate dropdowns
	_populate_conversation_dropdown(database)
	_populate_locale_dropdown()

	print("[TestRig] Initialized with %d conversations" % database.get_conversation_count())


func _populate_conversation_dropdown(database: GameScriptDatabase) -> void:
	conversation_dropdown.clear()
	var count := database.get_conversation_count()
	for i in range(count):
		var conv := database.get_conversation(i)
		conversation_dropdown.add_item(conv.get_name(), i)


func _populate_locale_dropdown() -> void:
	locale_dropdown.clear()
	var count := _manifest.get_locale_count()
	for i in range(count):
		var locale := _manifest.get_locale(i)
		var display_name := locale.get_localized_name()
		if display_name == "":
			display_name = locale.get_name()
		locale_dropdown.add_item(display_name, i)


func _on_start_pressed() -> void:
	if not _runner:
		push_error("Runner not initialized")
		return

	var conversation_index := conversation_dropdown.get_selected_id()

	# Create conversation UI
	var conversation_ui := ConversationUIScene.instantiate()
	conversation_container.add_child(conversation_ui)
	conversation_ui.start(_runner, conversation_index)


func _on_locale_selected(index: int) -> void:
	var locale := _manifest.get_locale(index)
	print("[TestRig] Switching to locale: %s" % locale.get_name())

	# Stop all active conversations and clear UI
	_runner.stop_all_conversations()
	for child in conversation_container.get_children():
		child.queue_free()

	# Change locale on the database (runner references the same database)
	_runner.database.change_locale(locale)

	# Repopulate conversation dropdown (names may be localized)
	_populate_conversation_dropdown(_runner.database)

	print("[TestRig] Locale switched to: %s" % locale.get_name())
