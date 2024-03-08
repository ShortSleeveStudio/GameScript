export class FlagCache {
    private _cache: Set<string>;
    constructor() {
        this._cache = new Set();
    }

    add(flag: string): void {
        this._cache.add(flag);
    }
}