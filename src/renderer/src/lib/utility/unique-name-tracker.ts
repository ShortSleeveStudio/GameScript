import { Action, type ActionHandler, type ActionUnsubscriber } from './action';

export class UniqueNameTracker {
    private _event: Action<void>;
    private _nameMap: Map<string, number>;

    constructor() {
        this._event = new Action();
        this._nameMap = new Map();
    }

    subscribe(handler: ActionHandler<void>): ActionUnsubscriber {
        const unsubscriber: ActionUnsubscriber = this._event.register(handler);
        handler();
        return unsubscriber;
    }

    unsubscribe(handler: ActionHandler<void>): void {
        this._event.unregister(handler);
    }

    addName(name: string): void {
        this.addNameQuiet(name);
        this._event.fire();
    }

    removeName(name: string): void {
        this.removeNameQuiet(name);
        this._event.fire();
    }

    swapName(from: string, to: string): void {
        this.removeNameQuiet(from);
        this.addNameQuiet(to);
        this._event.fire();
    }

    isNameUnique(name: string): boolean {
        if (this._nameMap.has(name)) {
            return <number>this._nameMap.get(name) <= 1;
        }
        return true;
    }

    private addNameQuiet(name: string): void {
        if (this._nameMap.has(name)) {
            this._nameMap.set(name, <number>this._nameMap.get(name) + 1);
        } else {
            this._nameMap.set(name, 1);
        }
    }

    private removeNameQuiet(name: string): void {
        let count: number | undefined = this._nameMap.get(name);
        if (count === undefined) return;
        count--;
        if (count <= 0) {
            this._nameMap.delete(name);
        } else {
            this._nameMap.set(name, count);
        }
    }
}
