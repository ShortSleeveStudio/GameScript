@tool
extends Node
## Test script for verifying GameScript Inspector elements.
##
## Attach this to a Node in a scene, then select the node in the editor
## to test the custom Inspector UI for each ID type.

@export var conversation: ConversationId
@export var actor: ActorId
@export var locale: LocaleId
@export var localization: LocalizationId


func _ready() -> void:
	if Engine.is_editor_hint():
		return

	print("=== Inspector Test Results ===")

	if conversation and conversation.is_valid():
		print("Conversation ID: ", conversation.value)
	else:
		print("Conversation: (not selected)")

	if actor and actor.is_valid():
		print("Actor ID: ", actor.value)
	else:
		print("Actor: (not selected)")

	if locale and locale.is_valid():
		print("Locale ID: ", locale.value)
	else:
		print("Locale: (not selected)")

	if localization and localization.is_valid():
		print("Localization ID: ", localization.value)
	else:
		print("Localization: (not selected)")
