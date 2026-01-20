## Notifier classes for async coordination between the runtime and game code.
##
## These lightweight signal wrappers allow the game to control conversation flow:
## - ReadyNotifier: Call on_ready() to proceed to the next step
## - DecisionNotifier: Call on_decision_made(node) to select a dialogue choice
##
## Both notifiers include sequence validation to prevent stale callbacks from
## affecting reused (pooled) contexts.


class_name _GameScriptNotifiers
extends RefCounted
## Internal namespace class - use ReadyNotifier and DecisionNotifier directly.


class ReadyNotifier extends RefCounted:
	## Emitted when on_ready() is called, signaling the runner can proceed.
	signal ready

	var _is_ready: bool = false
	var _context: RunnerContext
	var _sequence_number: int

	## Bind this notifier to a context for sequence validation.
	func bind(context: RunnerContext) -> void:
		_context = context
		_sequence_number = context.sequence_number

	## Call this to signal that the game is ready to proceed.
	## Safe to call even after the conversation has ended or been cancelled.
	func on_ready() -> void:
		assert(_context != null, "ReadyNotifier.on_ready() called before bind()")
		# Only complete if this notifier still belongs to the current conversation
		if _context.sequence_number == _sequence_number:
			_is_ready = true
			ready.emit()

	## Await this to wait for on_ready() to be called.
	## Handles the case where on_ready() was already called before awaiting.
	func wait() -> void:
		if not _is_ready:
			await ready

	## Await this to wait for either on_ready() or cancellation.
	## Returns true if ready, false if cancelled.
	func wait_with_cancellation(token: CancellationToken) -> bool:
		# Immediate exit checks (signals are events, not states)
		if token.is_cancelled:
			return false
		if _is_ready:
			return true

		# Race the signals: index 0 = ready, index 1 = cancelled
		var winner := await SignalRace.wait([ready, token.cancelled] as Array[Signal])
		return winner == 0

	## Reset for reuse. Call after each await completes.
	func reset() -> void:
		_is_ready = false


class DecisionNotifier extends RefCounted:
	## Emitted when on_decision_made() is called with the selected node index.
	signal decision_made(node_index: int)

	var _selected_index: int = -1
	var _context: RunnerContext
	var _sequence_number: int

	## Bind this notifier to a context for sequence validation.
	func bind(context: RunnerContext) -> void:
		_context = context
		_sequence_number = context.sequence_number

	## Call this to signal which node the player chose.
	## Safe to call even after the conversation has ended or been cancelled.
	## @param node The NodeRef the player selected from the choices.
	func on_decision_made(node: NodeRef) -> void:
		assert(_context != null, "DecisionNotifier.on_decision_made() called before bind()")
		# Only complete if this notifier still belongs to the current conversation
		if _context.sequence_number == _sequence_number:
			_selected_index = node.get_index()
			decision_made.emit(_selected_index)

	## Await this to wait for on_decision_made() to be called.
	## Returns the selected node index.
	## Handles the case where on_decision_made() was already called before awaiting.
	func wait() -> int:
		if _selected_index < 0:
			return await decision_made
		return _selected_index

	## Await this to wait for either on_decision_made() or cancellation.
	## Returns the selected node index, or -1 if cancelled.
	func wait_with_cancellation(token: CancellationToken) -> int:
		# Immediate exit checks
		if token.is_cancelled:
			return -1
		if _selected_index >= 0:
			return _selected_index

		# Race the signals: index 0 = decision_made, index 1 = cancelled
		var winner := await SignalRace.wait([decision_made, token.cancelled] as Array[Signal])
		if winner == 0:
			return _selected_index
		return -1

	## Reset for reuse. Call after each await completes.
	func reset() -> void:
		_selected_index = -1
