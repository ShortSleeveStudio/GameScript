## Notifier classes for async coordination between the runtime and game code.
##
## These lightweight signal wrappers allow the game to control conversation flow:
## - ReadyNotifier: Call on_ready() to proceed to the next step
## - DecisionNotifier: Call on_decision_made(node) to select a dialogue choice


class_name _GameScriptNotifiers
extends RefCounted
## Internal namespace class - use ReadyNotifier and DecisionNotifier directly.


class ReadyNotifier extends RefCounted:
	## Emitted when on_ready() is called, signaling the runner can proceed.
	signal ready

	var _is_ready: bool = false

	## Call this to signal that the game is ready to proceed.
	## The conversation runner will advance to the next state.
	func on_ready() -> void:
		_is_ready = true
		ready.emit()

	## Await this to wait for on_ready() to be called.
	## Handles the case where on_ready() was already called before awaiting.
	func wait() -> void:
		if not _is_ready:
			await ready

	## Reset for reuse. Call after each await completes.
	func reset() -> void:
		_is_ready = false


class DecisionNotifier extends RefCounted:
	## Emitted when on_decision_made() is called with the selected node index.
	signal decision_made(node_index: int)

	var _selected_index: int = -1

	## Call this to signal which node the player chose.
	## @param node The NodeRef the player selected from the choices.
	func on_decision_made(node: NodeRef) -> void:
		_selected_index = node.get_index()
		decision_made.emit(_selected_index)

	## Await this to wait for on_decision_made() to be called.
	## Returns the selected node index.
	## Handles the case where on_decision_made() was already called before awaiting.
	func wait() -> int:
		if _selected_index < 0:
			return await decision_made
		return _selected_index

	## Reset for reuse. Call after each await completes.
	func reset() -> void:
		_selected_index = -1
