@tool
class_name LocalizationId
extends Resource
## Wrapper for a GameScript Localization ID with custom inspector picker.
##
## Use this in @export properties to get a searchable picker in the Inspector.
##
## Example usage:
## [codeblock]
## @export var greeting_text: LocalizationId
##
## func get_text() -> String:
##     if greeting_text and greeting_text.is_valid():
##         var loc := database.find_localization(greeting_text.value)
##         return loc.get_text() if loc else ""
##     return ""
## [/codeblock]

## The localization ID value. 0 means no selection.
@export var value: int = 0


## Returns true if a localization is selected (value > 0).
func is_valid() -> bool:
	return value > 0
