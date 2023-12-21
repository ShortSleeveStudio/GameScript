import { Action, type ActionHandler, type ActionUnsubscriber } from './action';

export class UniqueNameTracker {
    private _event: Action;
    private _nameMap: Map<string, number>;

    constructor() {
        this._event = new Action();
        this._nameMap = new Map();
    }

    subscribe(handler: ActionHandler): ActionUnsubscriber {
        return this._event.register(handler);
    }

    unsubscribe(handler: ActionHandler) {
        this._event.unregister(handler);
    }

    addName(name: string): void {
        if (this._nameMap.has(name)) {
            this._nameMap.set(name, <number>this._nameMap.get(name) + 1);
        } else {
            this._nameMap.set(name, 1);
        }
        this._event.fire();
    }

    removeName(name: string): void {
        if (this._nameMap.has(name)) {
            this._nameMap.set(name, Math.max(0, <number>this._nameMap.get(name) - 1));
        }
        this._event.fire();
    }

    isNameUnique(name: string): boolean {
        if (this._nameMap.has(name)) {
            return <number>this._nameMap.get(name) <= 1;
        }
        return true;
    }
}
