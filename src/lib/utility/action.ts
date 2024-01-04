export type ActionHandler<T> = (value: T) => void;
export type ActionUnsubscriber = () => void;

/**
 * Simple event implementation.
 */
export class Action<T> {
    private _handlers: Set<ActionHandler<T>>;
    constructor() {
        this._handlers = new Set();
    }

    register(handler: ActionHandler<T>): ActionUnsubscriber {
        this._handlers.add(handler);
        return () => this.unregister(handler);
    }

    unregister(handler: ActionHandler<T>): void {
        this._handlers.delete(handler);
    }

    fire(value: T): void {
        this._handlers.forEach((handler: ActionHandler<T>) => handler(value));
    }
}
