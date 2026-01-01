/**
 * Action - A simple event emitter pattern.
 *
 * Ported from GameScriptElectron. Used by FocusManager
 * to notify subscribers of changes.
 *
 * @example
 * ```ts
 * const action = new Action<string>();
 *
 * const unsub = action.register((value) => console.log(value));
 * action.fire('hello'); // logs 'hello'
 *
 * unsub(); // unsubscribe
 * action.fire('world'); // nothing logged
 * ```
 */

export type ActionHandler<T> = (value: T) => void;
export type ActionUnsubscriber = () => void;

export class Action<T> {
    private _handlers: Set<ActionHandler<T>>;

    constructor() {
        this._handlers = new Set();
    }

    /**
     * Register a handler to be called when the action fires.
     * @returns An unsubscriber function to remove the handler.
     */
    register(handler: ActionHandler<T>): ActionUnsubscriber {
        this._handlers.add(handler);
        return () => this.unregister(handler);
    }

    /**
     * Unregister a specific handler.
     */
    unregister(handler: ActionHandler<T>): void {
        this._handlers.delete(handler);
    }

    /**
     * Unregister all handlers.
     */
    unregisterAll(): void {
        this._handlers.clear();
    }

    /**
     * Fire the action, calling all registered handlers with the given value.
     */
    fire(value?: T): void {
        this._handlers.forEach((handler: ActionHandler<T>) => {
            handler(value as T);
        });
    }
}
