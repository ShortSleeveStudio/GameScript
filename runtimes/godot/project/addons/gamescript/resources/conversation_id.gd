@tool
class_name ConversationId
extends Resource
## Wrapper for a GameScript Conversation ID with custom inspector picker.
##
## Use this in @export properties to get a searchable picker in the Inspector.
##
## Example usage:
## [codeblock]
## @export var conversation: ConversationId
##
## func start_dialogue():
##     if conversation and conversation.is_valid():
##         runner.start_conversation(conversation.value, listener)
## [/codeblock]

## The conversation ID value. 0 means no selection.
@export var value: int = 0


## Returns true if a conversation is selected (value > 0).
func is_valid() -> bool:
	return value > 0
