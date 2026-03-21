extends Control
## UI for a single conversation instance. Implements GameScriptListener.

const READ_TIME_SECONDS := 1.0
const HistoryItemScene := preload("res://test/history_item.tscn")
const ChoiceItemScene := preload("res://test/choice_item.tscn")

signal conversation_stopped

@export var history_content: VBoxContainer
@export var choice_content: VBoxContainer
@export var stop_button: Button

var _runner: GameScriptRunner
var _listener: _ConversationListener
var _active_conversation: ActiveConversation
var _is_completed: bool = false


func start(runner: GameScriptRunner, conversation_index: int) -> void:
	_runner = runner
	_listener = _ConversationListener.new(self)
	_active_conversation = runner.start_conversation_by_ref(
		runner.database.get_conversation(conversation_index),
		_listener
	)


func _on_stop_pressed() -> void:
	if not _is_completed and _runner and _active_conversation:
		_runner.stop_conversation(_active_conversation)
	conversation_stopped.emit()
	queue_free()


func _show_completed_state() -> void:
	_is_completed = true
	_clear_choices()
	_add_history_item("---", "[Conversation Ended]")
	if stop_button:
		stop_button.text = "Close"


func _add_history_item(actor_name: String, voice_text: String) -> void:
	var item := HistoryItemScene.instantiate()
	item.get_node("ActorText").text = actor_name + ":"
	item.get_node("VoiceText").text = voice_text
	history_content.add_child(item)


func _clear_history() -> void:
	for child in history_content.get_children():
		child.queue_free()


func _add_choice(text: String, callback: Callable) -> void:
	var button := ChoiceItemScene.instantiate()
	button.text = text if text != "" else "(Continue)"
	button.pressed.connect(callback)
	choice_content.add_child(button)


func _clear_choices() -> void:
	for child in choice_content.get_children():
		child.queue_free()


## Internal listener class that delegates to the ConversationUI
class _ConversationListener extends GameScriptListener:
	var _ui: Control  # ConversationUI

	func _init(ui: Control) -> void:
		_ui = ui

	func on_conversation_enter(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		print("[ConversationUI] Started: %s" % conversation.get_name())
		notifier.on_ready()

	func on_node_enter(node: NodeRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		notifier.on_ready()

	func on_speech_params(localization: LocalizationRef, node: NodeRef) -> _GameScriptTextResolutionParams.TextResolutionParams:
		return _build_resolution_params(localization, node)

	func on_decision_params(localization: LocalizationRef, choice_node: NodeRef) -> _GameScriptTextResolutionParams.TextResolutionParams:
		return _build_resolution_params(localization, choice_node)

	func _build_resolution_params(localization: LocalizationRef, node: NodeRef) -> _GameScriptTextResolutionParams.TextResolutionParams:
		var params := _GameScriptTextResolutionParams.TextResolutionParams.new()
		var GenderCategory = _GameScriptTextResolutionParams.GenderCategory
		var GrammaticalGender = _GameScriptTextResolutionParams.GrammaticalGender

		# Check subject actor for dynamic gender → provide feminine override
		var subject_idx: int = localization.get_subject_actor_idx()
		if subject_idx >= 0:
			var subject_actor = _ui._runner.database.get_actor(subject_idx)
			if subject_actor and subject_actor.is_valid() and subject_actor.get_grammatical_gender() == GrammaticalGender.DYNAMIC:
				params.set_gender_override(GenderCategory.FEMININE)

		if not localization.get_is_templated():
			return params

		# Read template args from node properties
		var template_name := ""
		var has_count := false
		var count := 0

		var prop_count := node.get_property_count()
		for i in range(prop_count):
			var prop = node.get_property(i)
			var prop_name := prop.get_name()
			if prop_name == "TemplateString":
				template_name = prop.get_string_value()
			elif prop_name == "Count":
				has_count = true
				count = prop.get_int_value()

		if template_name.is_empty():
			return params

		if has_count:
			params.set_plural(_GameScriptTextResolutionParams.PluralArg.cardinal(template_name, count))
		else:
			params.args.append(_GameScriptTextResolutionParams.Arg.string_arg(template_name, "TESTING"))

		return params

	func on_speech(node: NodeRef, voice_text: String, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		if voice_text != "":
			var actor := node.get_actor()
			var actor_name := ""
			if actor and actor.is_valid():
				actor_name = actor.get_localized_name()
				if actor_name == "":
					actor_name = actor.get_name()
			if actor_name == "":
				actor_name = "<Actor Missing>"

			_ui._add_history_item(actor_name, voice_text)
			print("[ConversationUI] %s: %s" % [actor_name, voice_text])

			# Wait for read time
			await _ui.get_tree().create_timer(READ_TIME_SECONDS).timeout

		notifier.on_ready()

	func on_decision(choices: Array, notifier: _GameScriptNotifiers.DecisionNotifier) -> void:
		_ui._clear_choices()

		for choice in choices:
			var choice_node: NodeRef = choice["node"]
			var ui_text: String = choice["ui_response_text"]
			if ui_text.is_empty():
				ui_text = "(Continue)"
			var captured_node := choice_node
			_ui._add_choice(ui_text, func():
				print("[ConversationUI] Chose: %s" % ui_text)
				_ui._clear_choices()
				notifier.on_decision_made(captured_node)
			)

	func on_node_exit(node: NodeRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		notifier.on_ready()

	func on_conversation_exit(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		print("[ConversationUI] Ended: %s" % conversation.get_name())
		# Don't clear history - keep it visible so user can review
		notifier.on_ready()

	func on_cleanup(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		# Show completed state with "Close" button instead of auto-freeing
		# This lets the user review the conversation history
		_ui._show_completed_state()
		notifier.on_ready()

	func on_error(conversation: ConversationRef, error: String, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		push_error("[ConversationUI] Error: %s" % error)
		notifier.on_ready()

	func on_conversation_cancelled(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
		print("[ConversationUI] Cancelled: %s" % conversation.get_name())
		# Clean up UI when conversation is forcibly stopped
		_ui._clear_history()
		_ui._clear_choices()
		notifier.on_ready()
