@tool
class_name GameScriptPlugin
extends EditorPlugin
## GameScript editor plugin for Godot.
##
## Provides custom inspector UI for ID types (ConversationId, ActorId, etc.)
## with searchable picker dialogs.

var _conversation_inspector: EditorInspectorPlugin
var _actor_inspector: EditorInspectorPlugin
var _locale_inspector: EditorInspectorPlugin
var _localization_inspector: EditorInspectorPlugin
var _export_validator: EditorExportPlugin


func _enter_tree() -> void:
	# Register custom inspector plugins
	_conversation_inspector = preload("res://addons/gamescript/editor/conversation_inspector.gd").new()
	_actor_inspector = preload("res://addons/gamescript/editor/actor_inspector.gd").new()
	_locale_inspector = preload("res://addons/gamescript/editor/locale_inspector.gd").new()
	_localization_inspector = preload("res://addons/gamescript/editor/localization_inspector.gd").new()

	add_inspector_plugin(_conversation_inspector)
	add_inspector_plugin(_actor_inspector)
	add_inspector_plugin(_locale_inspector)
	add_inspector_plugin(_localization_inspector)

	# Register export validator
	_export_validator = preload("res://addons/gamescript/editor/export_validator.gd").new()
	add_export_plugin(_export_validator)


func _exit_tree() -> void:
	# Unregister custom inspector plugins
	if _conversation_inspector:
		remove_inspector_plugin(_conversation_inspector)
		_conversation_inspector = null
	if _actor_inspector:
		remove_inspector_plugin(_actor_inspector)
		_actor_inspector = null
	if _locale_inspector:
		remove_inspector_plugin(_locale_inspector)
		_locale_inspector = null
	if _localization_inspector:
		remove_inspector_plugin(_localization_inspector)
		_localization_inspector = null

	if _export_validator:
		remove_export_plugin(_export_validator)
		_export_validator = null

	# Clear editor database cache
	_GameScriptEditorDatabase.clear()
