@tool
class_name LocaleId
extends Resource
## Wrapper for a GameScript Locale ID with custom inspector picker.
##
## Use this in @export properties to get a searchable picker in the Inspector.
##
## Example usage:
## [codeblock]
## @export var preferred_locale: LocaleId
##
## func get_locale() -> LocaleRef:
##     if preferred_locale and preferred_locale.is_valid():
##         return manifest.find_locale(preferred_locale.value)
##     return manifest.get_primary_locale()
## [/codeblock]

## The locale ID value. 0 means no selection.
@export var value: int = 0


## Returns true if a locale is selected (value > 0).
func is_valid() -> bool:
	return value > 0
