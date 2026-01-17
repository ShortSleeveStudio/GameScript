class_name ActiveConversation
extends RefCounted
## Handle to a running conversation.
##
## Returned by GameScriptRunner.start_conversation(). Use this to check
## if a conversation is still running or to stop it programmatically.
##
## Example:
## [codeblock]
## var handle = runner.start_conversation(conversation_id, listener)
##
## # Later...
## if handle.is_active():
##     handle.stop()
## [/codeblock]


var _runner: GameScriptRunner
var _sequence_number: int
var _context_id: int


func _init(runner: GameScriptRunner, sequence_number: int, context_id: int) -> void:
	_runner = runner
	_sequence_number = sequence_number
	_context_id = context_id


## Returns true if the conversation is still running.
func is_active() -> bool:
	return _runner.is_active(self)


## Stops the conversation immediately.
## Safe to call multiple times or on already-stopped conversations.
func stop() -> void:
	_runner.stop_conversation(self)


## Internal: Returns the sequence number for handle validation.
func get_sequence_number() -> int:
	return _sequence_number


## Internal: Returns the context ID for handle validation.
func get_context_id() -> int:
	return _context_id
