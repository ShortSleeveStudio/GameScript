@tool
class_name ActorId
extends Resource
## Wrapper for a GameScript Actor ID with custom inspector picker.
##
## Use this in @export properties to get a searchable picker in the Inspector.
##
## Example usage:
## [codeblock]
## @export var default_actor: ActorId
##
## func get_actor_name() -> String:
##     if default_actor and default_actor.is_valid():
##         var actor := database.find_actor(default_actor.value)
##         return actor.get_name() if actor else ""
##     return ""
## [/codeblock]

## The actor ID value. 0 means no selection.
@export var value: int = 0


## Returns true if an actor is selected (value > 0).
func is_valid() -> bool:
	return value > 0
