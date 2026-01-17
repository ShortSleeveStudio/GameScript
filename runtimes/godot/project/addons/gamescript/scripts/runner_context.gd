class_name RunnerContext
extends RefCounted
## Dialogue execution state machine.
##
## This class manages the flow of a single conversation. It is pooled and reused
## by GameScriptRunner to avoid allocation during gameplay.
##
## The context also serves as the IDialogueContext interface, providing
## conditions and actions with access to current node data.


# Node type constants (match C++ GameScriptNodeType enum)
const NODE_TYPE_ROOT := 0
const NODE_TYPE_DIALOGUE := 1
const NODE_TYPE_LOGIC := 2


#region Identity (for pooling/handle validation)
var context_id: int
var sequence_number: int
#endregion


#region Dependencies (set during initialize)
var _database: GameScriptDatabase
# Jump table references from GameScriptRunner (untyped - see runner comment)
var _conditions: Array
var _actions: Array
var _listener: GameScriptListener
var _settings: GameScriptSettings
#endregion


#region Current position
var _conversation_index: int = -1
var _node_index: int = -1
#endregion


#region Edge evaluation results (reused to avoid allocation)
var _choices: Array[NodeRef] = []
var _highest_priority_choices: Array[NodeRef] = []
#endregion


#region Concurrency tracking
var _pending_count: int = 0
signal _concurrent_complete
#endregion


#region Pooled notifiers (reused to avoid allocation)
var _ready_notifier: _GameScriptNotifiers.ReadyNotifier
var _speech_notifier: _GameScriptNotifiers.ReadyNotifier
var _decision_notifier: _GameScriptNotifiers.DecisionNotifier
#endregion


#region Static counters
static var _next_context_id: int = 1
static var _next_sequence_number: int = 1
#endregion


func _init(settings: GameScriptSettings) -> void:
	context_id = _next_context_id
	_next_context_id += 1
	_settings = settings

	# Create pooled notifiers once, reuse across conversations
	_ready_notifier = _GameScriptNotifiers.ReadyNotifier.new()
	_speech_notifier = _GameScriptNotifiers.ReadyNotifier.new()
	_decision_notifier = _GameScriptNotifiers.DecisionNotifier.new()


func initialize(database: GameScriptDatabase, conditions: Array,
				actions: Array, conversation_index: int,
				listener: GameScriptListener) -> void:
	_database = database
	_conditions = conditions
	_actions = actions
	_conversation_index = conversation_index
	_listener = listener

	var conversation := _database.get_conversation(conversation_index)
	_node_index = conversation.get_root_node().get_index()

	sequence_number = _next_sequence_number
	_next_sequence_number += 1


#region IDialogueContext Implementation
## Returns the current node's database ID.
func get_node_id() -> int:
	return _database.get_node(_node_index).get_id()


## Returns the current conversation's database ID.
func get_conversation_id() -> int:
	return _database.get_conversation(_conversation_index).get_id()


## Returns the current node's actor.
func get_actor() -> ActorRef:
	return _database.get_node(_node_index).get_actor()


## Returns the current node's voice/dialogue text.
func get_voice_text() -> String:
	return _database.get_node(_node_index).get_voice_text()


## Returns the current node's UI response text (for choice buttons).
func get_ui_response_text() -> String:
	return _database.get_node(_node_index).get_ui_response_text()


## Returns the number of custom properties on the current node.
func get_property_count() -> int:
	return _database.get_node(_node_index).get_property_count()


## Returns a custom property from the current node by index.
func get_property(index: int) -> NodePropertyRef:
	return _database.get_node(_node_index).get_property(index)
#endregion


#region Main Execution
## Run the conversation state machine. Called by GameScriptRunner.
func run() -> void:
	var conversation_ref := _database.get_conversation(_conversation_index)

	# Wrap entire state machine in error handling
	# GDScript doesn't have try/catch, so we track errors and handle at end
	var error_message: String = ""

	# 1. Conversation Enter
	_listener.on_conversation_enter(conversation_ref, _ready_notifier)
	await _ready_notifier.wait()
	_ready_notifier.reset()

	# Main loop
	while error_message == "":
		var node_ref := _database.get_node(_node_index)
		if not node_ref or not node_ref.is_valid():
			error_message = "Invalid node at index %d" % _node_index
			break

		var node_type := node_ref.get_type()

		# Root nodes skip directly to edge evaluation
		if node_type != NODE_TYPE_ROOT:
			# 2. Node Enter
			_listener.on_node_enter(node_ref, _ready_notifier)
			await _ready_notifier.wait()
			_ready_notifier.reset()

			# 3. Action + Speech (type-dependent)
			if node_type == NODE_TYPE_LOGIC:
				# Logic nodes: action only, no speech
				if node_ref.get_has_action():
					await _execute_action()
			else:
				# Dialogue nodes: action and speech run concurrently
				await _run_action_and_speech_concurrently(node_ref)

		# 4. Evaluate outgoing edges and find valid targets
		_choices.clear()
		_highest_priority_choices.clear()
		var highest_priority := -2147483648  # int.MinValue
		var all_same_actor := true
		var first_actor_index := -1

		var edge_count := node_ref.get_outgoing_edge_count()
		for i in range(edge_count):
			var edge := node_ref.get_outgoing_edge(i)
			var target_node := edge.get_target()
			if not target_node or not target_node.is_valid():
				push_warning("[GameScript] Edge %d has invalid target node - snapshot may be corrupted" % edge.get_id())
				continue
			var target_node_index := target_node.get_index()

			# Evaluate condition if present
			var condition_passed := true
			if target_node.get_has_condition():
				var condition = _conditions[target_node_index]  # Untyped - may be null or Callable
				if condition is Callable and condition.is_valid():
					# Temporarily set node index for condition context
					var saved_node_index := _node_index
					_node_index = target_node_index
					condition_passed = condition.call(self)
					_node_index = saved_node_index
				else:
					push_error("[GameScript] Node %d has has_condition=true but no condition method was found." % target_node.get_id())

			if condition_passed:
				_choices.append(target_node)

				# Track actor consistency
				var target_actor := target_node.get_actor()
				var target_actor_index := target_actor.get_index() if target_actor and target_actor.is_valid() else -1

				if _choices.size() == 1:
					first_actor_index = target_actor_index
				elif all_same_actor and target_actor_index != first_actor_index:
					all_same_actor = false

				# Track highest priority choices
				var edge_priority := edge.get_priority()
				if edge_priority > highest_priority:
					highest_priority = edge_priority
					_highest_priority_choices.clear()
					_highest_priority_choices.append(target_node)
				elif edge_priority == highest_priority:
					_highest_priority_choices.append(target_node)

		# 5. Decision (optional) - if player must choose
		var is_decision := _choices.size() > 0 and _should_show_decision(node_ref, all_same_actor)
		if is_decision:
			_listener.on_decision(_choices, _decision_notifier)
			_node_index = await _decision_notifier.wait()
			_decision_notifier.reset()
		elif _choices.size() > 0:
			# Auto-advance via listener (allows custom selection logic)
			var selected := _listener.on_auto_decision(_highest_priority_choices)
			if not selected or not selected.is_valid():
				error_message = "on_auto_decision returned invalid node"
				break
			_node_index = selected.get_index()

		# 6. Node Exit (skip for root nodes)
		if node_type != NODE_TYPE_ROOT:
			_listener.on_node_exit(node_ref, _ready_notifier)
			await _ready_notifier.wait()
			_ready_notifier.reset()

		# No valid edges - conversation ends
		if _choices.size() == 0:
			break

	# Handle errors
	if error_message != "":
		_listener.on_error(conversation_ref, error_message)
		_reset()
		return

	# 7. Conversation Exit
	_listener.on_conversation_exit(conversation_ref, _ready_notifier)
	await _ready_notifier.wait()
	_ready_notifier.reset()

	# 8. Final cleanup signal (synchronous)
	_listener.on_cleanup(conversation_ref)

	_reset()
#endregion


#region Private Helpers
func _execute_action() -> void:
	var action = _actions[_node_index]  # Untyped - may be null or Callable
	if action is Callable and action.is_valid():
		await action.call(self)
	else:
		var node := _database.get_node(_node_index)
		push_error("[GameScript] Node %d has has_action=true but no action method was found." % node.get_id())


func _run_action_and_speech_concurrently(node_ref: NodeRef) -> void:
	if node_ref.get_has_action():
		# Both action and speech run concurrently
		_pending_count = 2

		# Start action
		_run_action_then_signal()

		# Start speech (use _speech_notifier for concurrent case)
		_speech_notifier.ready.connect(_on_concurrent_task_complete)
		_listener.on_speech(node_ref, _speech_notifier)

		# Wait for both to complete
		await _concurrent_complete

		# Clean up
		_speech_notifier.ready.disconnect(_on_concurrent_task_complete)
		_speech_notifier.reset()
	else:
		# Speech only (use _speech_notifier)
		_listener.on_speech(node_ref, _speech_notifier)
		await _speech_notifier.wait()
		_speech_notifier.reset()


func _run_action_then_signal() -> void:
	await _execute_action()
	_on_concurrent_task_complete()


func _on_concurrent_task_complete() -> void:
	_pending_count -= 1
	if _pending_count == 0:
		_concurrent_complete.emit()


func _should_show_decision(current_node: NodeRef, all_same_actor: bool) -> bool:
	# Never show decisions if current node prevents it
	if current_node.get_is_prevent_response():
		return false

	# Multiple choices = decision (if same actor)
	if _choices.size() > 1:
		return all_same_actor

	# Single choice with UI text = decision (unless settings prevent it)
	if _choices.size() == 1 and not _settings.prevent_single_node_choices:
		var response_text := _choices[0].get_ui_response_text()
		return response_text != "" and all_same_actor

	return false


func _reset() -> void:
	_database = null
	_conditions = []
	_actions = []
	_listener = null
	_conversation_index = -1
	_node_index = -1
	_choices.clear()
	_highest_priority_choices.clear()
#endregion
