class_name GameScriptSettings
extends Resource
## Settings resource for GameScript runtime configuration.
##
## Create a .tres file with these settings and pass it to GameScriptRunner.

## Path to the GameScript data directory (relative to res://).
## This directory should contain manifest.json and the locales/ subdirectory.
@export_dir var game_data_path: String = "GameScript"

## Path to dialogue logic scripts folder (relative to res://).
## Scripts in this folder will be scanned for cond_* and act_* methods.
## Set empty to skip automatic logic discovery.
@export_dir var logic_folder_path: String = "dialogue_logic"

## Number of RunnerContext instances to pre-allocate in the pool.
## Higher values reduce allocation during gameplay but use more memory.
@export_range(1, 10) var initial_conversation_pool: int = 1

## When true, single-choice nodes with UI response text will auto-advance
## instead of showing a decision prompt.
@export var prevent_single_node_choices: bool = false

## Path to the IDE executable for opening GameScript editor.
## Examples: "/usr/local/bin/code" (VSCode), "/usr/local/bin/rider" (Rider)
## Leave empty to disable the Edit button in Inspector property pickers.
@export_global_file var ide_executable_path: String = ""
