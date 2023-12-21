export type ActionHandler = () => void;
export type ActionUnsubscriber = () => void;

/**
 * Simple event implementation.
 */
export class Action {
    private _handlers: Set<ActionHandler>;
    constructor() {
        this._handlers = new Set();
    }

    register(handler: ActionHandler): ActionUnsubscriber {
        this._handlers.add(handler);
        return () => this.unregister(handler);
    }

    unregister(handler: ActionHandler): void {
        this._handlers.delete(handler);
    }

    fire(): void {
        this._handlers.forEach((handler: ActionHandler) => handler());
    }
}
