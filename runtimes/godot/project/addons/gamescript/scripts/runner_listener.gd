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
## func on_speech(node: NodeRef, voice_text: String, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
##     dialogue_label.text = voice_text  # Pre-resolved by the runner
##     await get_tree().create_timer(2.0).timeout  # Show for 2 seconds
##     notifier.on_ready()
##
## func on_decision(choices: Array, notifier: _GameScriptNotifiers.DecisionNotifier) -> void:
##     # Each choice: {"node": NodeRef, "ui_response_text": String}
##     # Display choice buttons, call notifier.on_decision_made(choice["node"]) when player clicks
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


## Called before on_speech for nodes that have voice text.
## Return the TextResolutionParams the runner should use when resolving
## the variant and template for this node's voice text.
## Called unconditionally — not gated by is_templated.
##
## Default implementation: auto-resolve gender from the snapshot; use
## PluralCategory.OTHER; no template arguments.
func on_speech_params(localization: LocalizationRef, node: NodeRef) -> _GameScriptTextResolutionParams.TextResolutionParams:
	return _GameScriptTextResolutionParams.TextResolutionParams.new()


## Called once per choice node before on_decision.
## Return the TextResolutionParams the runner should use when resolving
## the UI response text for that choice.
## Called unconditionally — not gated by is_templated.
func on_decision_params(localization: LocalizationRef, choice_node: NodeRef) -> _GameScriptTextResolutionParams.TextResolutionParams:
	return _GameScriptTextResolutionParams.TextResolutionParams.new()


## Called when a dialogue node has speech to present.
## This runs concurrently with the node's action (if any).
## The voice_text has already been fully resolved by the runner:
## gender, plural category, and template substitution have all been applied using
## the parameters returned from on_speech_params.
## Call notifier.on_ready() when the speech presentation is complete.
##
## Note: This is NOT called for logic nodes (nodes without speech text).
func on_speech(node: NodeRef, voice_text: String, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when the player must choose between multiple nodes.
## Each choice is a Dictionary with keys: "node" (NodeRef), "ui_response_text" (String).
## Call notifier.on_decision_made(chosen_node) with the selected NodeRef.
##
## This method has no default implementation - you must override it to handle player choices.
func on_decision(choices: Array, notifier: _GameScriptNotifiers.DecisionNotifier) -> void:
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


## Called when a conversation is forcibly stopped via stop_conversation().
## Use this for cleanup: hiding dialogue UI, fading out animations, etc.
## Call notifier.on_ready() when cleanup is complete.
##
## Note: No cancellation - cleanup must complete and cannot be cancelled.
func on_conversation_cancelled(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when an error occurs during conversation execution.
## Use this for error handling: showing error UI, logging, etc.
## Call notifier.on_ready() when error handling is complete.
##
## Note: No cancellation - error handling must complete and cannot be cancelled.
func on_error(conversation: ConversationRef, error: String, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	push_error("GameScript error in conversation %d: %s" % [conversation.get_id(), error])
	notifier.on_ready()


## Called in all paths (normal exit, cancellation, or error) before the RunnerContext
## is released back to the pool. Use this for final cleanup: notifying managers,
## releasing resources, resetting state, etc.
## Call notifier.on_ready() when cleanup is complete.
##
## Note: No cancellation - cleanup must complete and cannot be cancelled.
func on_cleanup(conversation: ConversationRef, notifier: _GameScriptNotifiers.ReadyNotifier) -> void:
	notifier.on_ready()


## Called when the conversation auto-advances without player input
## (e.g., when is_prevent_response is true or no UI response text).
## Return the chosen Dictionary from the list of highest-priority choices.
## Each choice is a Dictionary with keys: "node" (NodeRef), "ui_response_text" (String).
##
## Default implementation selects randomly among the choices.
## Override to implement weighted selection, round-robin, or game-specific logic.
##
## @param choices Highest-priority target choices (all passed conditions and share same priority)
## @return The choice to advance to
func on_auto_decision(choices: Array) -> Dictionary:
	return choices[randi() % choices.size()]
