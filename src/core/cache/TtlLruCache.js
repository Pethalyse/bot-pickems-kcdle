import {ICache} from "./ICache.js";

export class TtlLruCache extends ICache{
    constructor({ defaultTtlMs = 60_000, maxSize = 500 } = {}) {
        super();
        this.defaultTtlMs = defaultTtlMs;
        this.maxSize = maxSize;
        this.map = new Map();
    }
    #now() { return Date.now(); }
    #expired(entry) { return entry.expireAt < this.#now(); }

    set(key, value, ttlMs = this.defaultTtlMs) {
        const expireAt = this.#now() + ttlMs;
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, { value, expireAt });
        this.#evictIfNeeded();
    }

    get(key) {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        if (this.#expired(entry)) {
            this.map.delete(key);
            return undefined;
        }

        this.map.delete(key);
        this.map.set(key, entry);
        return entry.value;
    }

    has(key) { return this.get(key) !== undefined; }

    delete(key) { this.map.delete(key); }

    clear() { this.map.clear(); }

    #evictIfNeeded() {
        while (this.map.size > this.maxSize) {
            // supprime l’élément le plus ancien (LRU)
            const oldestKey = this.map.keys().next().value;
            this.map.delete(oldestKey);
        }
    }
}
