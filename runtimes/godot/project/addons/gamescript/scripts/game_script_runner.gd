class_name GameScriptRunner
extends RefCounted
## The dialogue execution engine.
##
## GameScriptRunner manages conversation execution, context pooling, and logic discovery.
## Create one with a database and settings, then start conversations with listeners.
##
## Example:
## [codeblock]
## var manifest = GameScriptLoader.load_manifest()
## var database = manifest.load_database_primary()
## var settings = preload("res://game_script_settings.tres")
## var runner = GameScriptRunner.new(database, settings)
##
## # Start a conversation
## var handle = runner.start_conversation(conversation_id, my_listener)
## [/codeblock]


#region State
var _database: GameScriptDatabase
var _settings: GameScriptSettings

# Jump tables indexed by node_index for O(1) dispatch.
# Note: Using untyped Array because Array[Callable] doesn't support resize() with null defaults
# and Callable.is_valid() is used to check for unbound slots at runtime.
var _conditions: Array = []
var _actions: Array = []

# Context pooling
var _contexts_active: Array[RunnerContext] = []
var _contexts_inactive: Array[RunnerContext] = []

# Keep references to logic providers to prevent GC
var _logic_providers: Array[RefCounted] = []
#endregion


## Creates a new runner with the specified database and settings.
## @param database The GameScriptDatabase to use for dialogue data.
## @param settings The GameScriptSettings resource with configuration.
## @param logic_folder Optional additional logic folder path to scan.
func _init(database: GameScriptDatabase, settings: GameScriptSettings, logic_folder: String = "") -> void:
	_database = database
	_settings = settings

	# Size jump tables to node count for O(1) indexed access
	var node_count := _database.get_node_count()
	_conditions.resize(node_count)
	_actions.resize(node_count)

	# Discover logic from settings path (if configured)
	if settings.logic_folder_path != "":
		register_logic_folder("res://" + settings.logic_folder_path)

	# Discover logic from constructor path (if provided)
	if logic_folder != "":
		register_logic_folder(logic_folder)

	# Pre-allocate context pool
	for i in range(settings.initial_conversation_pool):
		_contexts_inactive.append(RunnerContext.new(_settings))


#region Public API
## The database this runner was created with.
var database: GameScriptDatabase:
	get: return _database


## Register all logic scripts in a folder (recursive).
## Scripts are scanned for methods matching cond_{node_id} and act_{node_id} conventions.
## @param path The folder path to scan (e.g., "res://dialogue_logic/")
func register_logic_folder(path: String) -> void:
	var scripts := _get_all_scripts_recursive(path)
	for script_path in scripts:
		var script := load(script_path)
		if script:
			var provider = script.new()
			register_logic_provider(provider)


## Register a single logic provider instance.
## The provider will be scanned for cond_* and act_* methods.
## @param provider An object with condition/action methods.
func register_logic_provider(provider: RefCounted) -> void:
	_logic_providers.append(provider)  # Prevent GC
	_scan_and_bind_methods(provider)


## Start a conversation by database ID.
## @param conversation_id The conversation's database ID.
## @param listener The listener to receive dialogue events.
## @return A handle to the running conversation.
func start_conversation(conversation_id: int, listener: GameScriptListener) -> ActiveConversation:
	var conv := _database.find_conversation(conversation_id)
	return start_conversation_by_ref(conv, listener)


## Start a conversation by reference.
## @param conversation The ConversationRef to start.
## @param listener The listener to receive dialogue events.
## @return A handle to the running conversation.
func start_conversation_by_ref(conversation: ConversationRef, listener: GameScriptListener) -> ActiveConversation:
	var ctx := _context_acquire()
	ctx.initialize(_database, _conditions, _actions, conversation.get_index(), listener)

	# Start the conversation - it runs asynchronously and releases itself when done
	_run_conversation_async(ctx)

	return ActiveConversation.new(self, ctx.sequence_number, ctx.context_id)


## Check if a conversation is still running.
## @param handle The ActiveConversation handle to check.
## @return True if the conversation is still active.
func is_active(handle: ActiveConversation) -> bool:
	return _find_context_active(handle) != null


## Stop a specific conversation.
## Safe to call on already-stopped conversations.
## @param handle The ActiveConversation handle to stop.
func stop_conversation(handle: ActiveConversation) -> void:
	var ctx := _find_context_active(handle)
	if ctx:
		_context_release(ctx)


## Stop all active conversations.
func stop_all_conversations() -> void:
	# Duplicate the array since we're modifying it during iteration
	for ctx in _contexts_active.duplicate():
		_context_release(ctx)
#endregion


#region Private Helpers
func _get_all_scripts_recursive(path: String) -> Array[String]:
	var result: Array[String] = []
	var dir := DirAccess.open(path)
	if dir:
		dir.list_dir_begin()
		var file_name := dir.get_next()
		while file_name != "":
			var full_path := path.path_join(file_name)
			if dir.current_is_dir() and not file_name.begins_with("."):
				result.append_array(_get_all_scripts_recursive(full_path))
			elif file_name.ends_with(".gd"):
				result.append(full_path)
			file_name = dir.get_next()
		dir.list_dir_end()
	return result


func _scan_and_bind_methods(provider: Object) -> void:
	for method in provider.get_method_list():
		var m_name: String = method["name"]

		# Convention: cond_{node_id}
		if m_name.begins_with("cond_"):
			var node_id := m_name.substr(5).to_int()
			var node_index := _database.get_node_index(node_id)
			if node_index >= 0 and node_index < _conditions.size():
				_conditions[node_index] = Callable(provider, m_name)

		# Convention: act_{node_id}
		elif m_name.begins_with("act_"):
			var node_id := m_name.substr(4).to_int()
			var node_index := _database.get_node_index(node_id)
			if node_index >= 0 and node_index < _actions.size():
				_actions[node_index] = Callable(provider, m_name)


func _run_conversation_async(context: RunnerContext) -> void:
	await context.run()
	# Context is done, return to pool
	_context_release(context)


func _context_acquire() -> RunnerContext:
	var context: RunnerContext
	if _contexts_inactive.is_empty():
		context = RunnerContext.new(_settings)
	else:
		context = _contexts_inactive.pop_back()
	_contexts_active.append(context)
	return context


func _context_release(context: RunnerContext) -> void:
	var index := _contexts_active.find(context)
	if index >= 0:
		_contexts_active.remove_at(index)
		_contexts_inactive.append(context)


func _find_context_active(handle: ActiveConversation) -> RunnerContext:
	for ctx in _contexts_active:
		if ctx.context_id == handle.get_context_id():
			if ctx.sequence_number != handle.get_sequence_number():
				return null  # Stale handle - context was reused
			return ctx
	return null
#endregion
