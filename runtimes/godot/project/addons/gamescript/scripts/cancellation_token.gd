class_name CancellationToken
extends RefCounted
## Cooperative cancellation token for async operations.
##
## When cancel() is called, is_cancelled becomes true and the cancelled signal emits.
## Awaiting coroutines can check is_cancelled or connect to cancelled to exit early.
##
## This class is RefCounted so that when a pooled RunnerContext creates a new token,
## the old token (and all its signal connections) are automatically cleaned up.


## Emitted when cancel() is called.
signal cancelled


## True after cancel() has been called.
var is_cancelled: bool = false


## Cancel this token, emitting the cancelled signal.
## Safe to call multiple times (idempotent).
func cancel() -> void:
	if is_cancelled:
		return
	is_cancelled = true
	cancelled.emit()
