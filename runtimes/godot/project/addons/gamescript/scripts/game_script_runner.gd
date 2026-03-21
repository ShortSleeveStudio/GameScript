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

# Cached CLDR rule indices for the current locale (avoids per-call string
# allocations from locale normalization). Invalidated on locale change.
var _cached_cardinal_rule_idx: int = 0
var _cached_ordinal_rule_idx: int = 0
var _cldr_rules_cached: bool = false
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

	# Invalidate cached CLDR rules when the locale changes
	_database.connect("locale_changed", _on_locale_changed)

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
	ctx.initialize(_database, self, _conditions, _actions, conversation.get_index(), listener)

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
	if ctx == null:
		return  # Already ended, idempotent

	ctx.cancel()


## Stop all active conversations.
func stop_all_conversations() -> void:
	for ctx in _contexts_active:
		ctx.cancel()
#endregion


#region Text Resolution
## Resolves the text for a localization entry with the given parameters.
## Performs gender resolution, plural category selection, variant picking,
## and template substitution in a single pass.
func _resolve_text(localization_idx: int, node: NodeRef, params: _GameScriptTextResolutionParams.TextResolutionParams) -> String:
	if localization_idx < 0:
		return ""

	var localization := _database.get_localization(localization_idx)
	if not localization or not localization.is_valid():
		return ""

	# 1. Resolve gender
	var gender := _resolve_gender(localization, params)

	# 2. Resolve plural category (cardinal or ordinal based on PluralArg.Type)
	var PluralCategory = _GameScriptTextResolutionParams.PluralCategory
	var plural: int = PluralCategory.OTHER
	if params.has_plural:
		_ensure_cldr_rules_cached()
		if params.plural.type == _GameScriptTextResolutionParams.PluralType.ORDINAL:
			plural = _GameScriptCldrPluralRules.apply_ordinal_rule(_cached_ordinal_rule_idx, params.plural.value)
		else:
			plural = _GameScriptCldrPluralRules.apply_rule(_cached_cardinal_rule_idx, params.plural.value, params.plural.precision)

	# 3. Select variant
	var text := _GameScriptVariantResolver.resolve(localization, gender, plural)
	if text.is_empty():
		return ""

	# 4. Template substitution — only when is_templated is set and there are args
	var has_plural: bool = params.has_plural
	var has_args: bool = params.args.size() > 0
	if localization.get_is_templated() and (has_plural or has_args):
		text = _apply_template(text, params)

	return text


## Resolves the effective GenderCategory from the localization and optional caller override.
func _resolve_gender(localization: LocalizationRef, params: _GameScriptTextResolutionParams.TextResolutionParams) -> int:
	var GenderCategory = _GameScriptTextResolutionParams.GenderCategory
	var GrammaticalGender = _GameScriptTextResolutionParams.GrammaticalGender

	# Caller-supplied override always wins
	if params.has_gender_override:
		return params.gender_override

	# Derive from subject actor's grammatical gender
	var actor_idx: int = localization.get_subject_actor_idx()
	if actor_idx >= 0:
		var actor := _database.get_actor(actor_idx)
		if actor and actor.is_valid():
			var gg: int = actor.get_grammatical_gender()
			match gg:
				GrammaticalGender.MASCULINE: return GenderCategory.MASCULINE
				GrammaticalGender.FEMININE: return GenderCategory.FEMININE
				GrammaticalGender.NEUTER: return GenderCategory.NEUTER
				_: return GenderCategory.OTHER  # Other + Dynamic

	# Fall back to direct gender on the localization
	return localization.get_subject_gender()


## Single-pass template substitution.
## Supports {{ -> literal '{', }} -> literal '}'.
## {name} placeholders resolved from params.plural.name and params.args[].name.
## Unknown placeholders are passed through unchanged.
func _apply_template(text: String, params: _GameScriptTextResolutionParams.TextResolutionParams) -> String:
	var result := PackedStringArray()
	var len := text.length()
	var i := 0

	while i < len:
		var c := text[i]

		if c == "{":
			# Escaped brace: {{ -> '{'
			if i + 1 < len and text[i + 1] == "{":
				result.append("{")
				i += 2
				continue

			# Scan for matching '}'
			var start := i + 1
			var end := start
			while end < len and text[end] != "}":
				end += 1

			if end >= len:
				# Malformed — no closing brace; emit rest of string literally
				result.append(text.substr(i))
				break

			var placeholder := text.substr(start, end - start)

			# Try PluralArg first (formatted as locale-aware number)
			var resolved := false
			if params.has_plural and params.plural.name == placeholder:
				result.append(_format_plural_arg(params.plural))
				resolved = true

			# Try typed Args
			if not resolved:
				for arg in params.args:
					if arg.name == placeholder:
						result.append(_format_arg(arg))
						resolved = true
						break

			# Unknown placeholder — pass through unchanged
			if not resolved:
				result.append("{")
				result.append(placeholder)
				result.append("}")

			i = end + 1  # skip past '}'

		elif c == "}":
			# Escaped brace: }} -> '}'
			if i + 1 < len and text[i + 1] == "}":
				result.append("}")
				i += 2
			else:
				# Lone '}' — emit literally (lenient)
				result.append("}")
				i += 1
		else:
			result.append(c)
			i += 1

	return "".join(result)


## Formats a PluralArg value for template substitution.
func _format_plural_arg(pa: _GameScriptTextResolutionParams.PluralArg) -> String:
	if pa.precision > 0:
		# Decimal: format with precision decimal places
		var display_value: float = pa.value / _pow10(pa.precision)
		return _format_number(display_value, pa.precision)
	else:
		# Integer: grouped integer formatting
		return _format_integer(pa.value)


## Formats a single Arg value based on its ArgType.
func _format_arg(arg: _GameScriptTextResolutionParams.Arg) -> String:
	var ArgType = _GameScriptTextResolutionParams.ArgType
	match arg.type:
		ArgType.STRING:
			return arg.string_value if arg.string_value else ""

		ArgType.INT:
			return _format_integer(arg.numeric_value)

		ArgType.DECIMAL:
			var value: float = arg.numeric_value / _pow10(arg.precision)
			var precision: int = arg.precision if arg.precision > 0 else 0
			return _format_number(value, precision)

		ArgType.PERCENT:
			# Value is percentage * 10^precision (e.g., 155 with precision 1 = 15.5%)
			# Divide by 10^precision to get the percentage display value
			var pct: float = arg.numeric_value / _pow10(arg.precision)
			var precision: int = arg.precision if arg.precision > 0 else 0
			return _format_number(pct, precision) + "%"

		ArgType.CURRENCY:
			var decimals := _GameScriptIso4217.get_minor_unit_digits(arg.currency_code)
			var value: float = arg.numeric_value / _pow10(decimals)
			var symbol := _GameScriptIso4217.get_symbol(arg.currency_code)
			return symbol + _format_number(value, decimals)

		ArgType.RAW_INT:
			return str(arg.numeric_value)

	return ""


## Formats an integer with grouping separators (e.g., 1,000).
static func _format_integer(value: int) -> String:
	var negative := value < 0
	var abs_value := absi(value)
	var s := str(abs_value)
	if s.length() <= 3:
		return ("-" + s) if negative else s

	var result := PackedStringArray()
	var count := 0
	for idx in range(s.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0:
			result.append(",")
		result.append(s[idx])
		count += 1

	result.reverse()
	var formatted := "".join(result)
	return ("-" + formatted) if negative else formatted


## Formats a float with the specified number of decimal places and grouping separators.
static func _format_number(value: float, precision: int) -> String:
	var negative := value < 0.0
	var abs_value := absf(value)

	# Split into integer and fractional parts
	var int_part := int(abs_value)
	var int_str := _format_integer(int_part)
	# Remove the negative sign from int_str since we handle it ourselves
	if int_str.begins_with("-"):
		int_str = int_str.substr(1)

	if precision <= 0:
		return ("-" + int_str) if negative else int_str

	# Compute fractional part with rounding
	# Derive both parts from the rounded total to handle carry-over correctly
	# (e.g., 9.999 with precision=2 → rounded=1000, int=10, frac=00)
	var scale := int(_pow10(precision))
	var rounded := roundi(abs_value * scale)
	var rounded_int := rounded / scale
	var frac_part := rounded % scale

	# Re-format the integer part in case rounding changed it
	int_str = _format_integer(rounded_int)
	if int_str.begins_with("-"):
		int_str = int_str.substr(1)

	var frac_str := str(frac_part)
	while frac_str.length() < precision:
		frac_str = "0" + frac_str

	var result := int_str + "." + frac_str
	return ("-" + result) if negative else result


## Integer power of 10. Precision values are small (0-6 in practice).
static func _pow10(exponent: int) -> float:
	match exponent:
		0: return 1.0
		1: return 10.0
		2: return 100.0
		3: return 1000.0
		4: return 10000.0
		5: return 100000.0
		6: return 1000000.0
		_: return pow(10.0, exponent)


## Caches the CLDR cardinal and ordinal rule indices for the current locale.
## Called once per locale; invalidated on locale change.
func _ensure_cldr_rules_cached() -> void:
	if _cldr_rules_cached:
		return
	var locale := _database.get_current_locale()
	var locale_name := locale.get_name() if locale and locale.is_valid() else ""
	_cached_cardinal_rule_idx = _GameScriptCldrPluralRules.lookup_cardinal_rule(locale_name)
	_cached_ordinal_rule_idx = _GameScriptCldrPluralRules.lookup_ordinal_rule(locale_name)
	_cldr_rules_cached = true


func _on_locale_changed() -> void:
	_cldr_rules_cached = false
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
