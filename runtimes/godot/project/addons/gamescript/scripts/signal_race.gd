class_name SignalRace
extends RefCounted
## Utility for awaiting multiple signals and returning whichever fires first.
##
## This is the idiomatic GDScript 4 pattern for "racing" signals. The racer
## is RefCounted, so when it goes out of scope after the await completes,
## all remaining signal connections are automatically cleaned up.
##
## Example:
## [codeblock]
## # Wait for either ready or cancelled, get index of winner
## var winner = await SignalRace.wait([ready_signal, cancelled_signal])
## if winner == 0:
##     print("Ready fired first")
## else:
##     print("Cancelled fired first")
## [/codeblock]


signal finished(index: int)


## Wait for any of the provided signals to fire.
## Returns the index of the signal that fired first.
static func wait(signals: Array[Signal]) -> int:
	assert(signals.size() > 0, "SignalRace.wait requires at least one signal")
	var racer = SignalRace.new()
	for i in signals.size():
		# Use a lambda to ignore any arguments the signal passes
		var callback := func(_a = null, _b = null, _c = null, _d = null): racer._on_signal_fired(i)
		signals[i].connect(callback, CONNECT_ONE_SHOT)

	# This keeps 'racer' alive until the signal fires
	return await racer.finished


func _on_signal_fired(index: int) -> void:
	finished.emit(index)
