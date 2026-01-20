class_name GameScriptListener
extends RefCounted
## Base class for handling dialogue events from GameScriptRunner.
##
## Extend this class and override methods to react to conversation state changes.
## Most methods receive a notifier - call its on_ready() or on_decision_made()
## method when your game is ready to proceed.
##
## Example:
## [codeblock]
## class_name MyDialogueUI extends GameScriptListener
##
## func on_speech(node: NodeRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
##     dialogue_label.text = node.get_voice_text()
##     await get_tree().create_timer(2.0).timeout  # Show for 2 seconds
##     notifier.on_ready()
##
## func on_decision(choices: Array[NodeRef], notifier: _GameScriptNotifiers.DecisionNotifier) -> void:
##     # Display choice buttons, call notifier.on_decision_made(selected_node) when player clicks
##     pass
## [/codeblock]


## Called before the conversation starts.
## Call notifier.on_ready() when ready to proceed.
func on_conversation_enter(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when entering a node, before any action or speech.
## Call notifier.on_ready() when ready to proceed.
func on_node_enter(node: NodeRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when a dialogue node has speech to present.
## This runs concurrently with the node's action (if any).
## Call notifier.on_ready() when the speech presentation is complete.
##
## Note: This is NOT called for logic nodes (nodes without speech text).
func on_speech(node: NodeRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when the player must choose between multiple nodes.
## Call notifier.on_decision_made(chosen_node) with the selected NodeRef.
##
## This method has no default implementation - you must override it to handle player choices.
func on_decision(choices: Array[NodeRef], notifier: _GameScriptNotifiers.DecisionNotifier) -> void:
	push_error("GameScriptListener.on_decision() must be overridden to handle player choices")


## Called before leaving the current node.
## Use this for cleanup before advancing to the next node.
## Call notifier.on_ready() when ready to proceed.
func on_node_exit(node: NodeRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when the conversation ends normally.
## Call notifier.on_ready() when ready to proceed.
func on_conversation_exit(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called after on_conversation_exit's notifier.on_ready() is processed,
## right before the RunnerContext is released back to the pool.
## Use this for final cleanup: notifying managers, releasing resources, etc.
##
## This is synchronous - do not await in this method.
func on_cleanup(conversation: ConversationRef) -> void:
	pass


## Called when an error occurs during conversation execution.
func on_error(conversation: ConversationRef, error: String) -> void:
	push_error("GameScript error in conversation %d: %s" % [conversation.get_id(), error])


## Called when a conversation is forcibly stopped via stop_conversation().
## Use this for immediate cleanup: hiding dialogue UI, cancelling animations, etc.
## This is synchronous (no notifier) since we're not waiting for anything.
func on_conversation_cancelled(conversation: ConversationRef) -> void:
	pass


## Called when the conversation auto-advances without player input
## (e.g., when is_prevent_response is true or no UI response text).
## Return the node to advance to from the list of highest-priority choices.
##
## Default implementation selects randomly among the choices.
## Override to implement weighted selection, round-robin, or game-specific logic.
##
## @param choices Highest-priority target nodes (all passed conditions and share same priority)
## @return The node to advance to
func on_auto_decision(choices: Array[NodeRef]) -> NodeRef:
	return choices[randi() % choices.size()]
