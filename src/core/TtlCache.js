export class TtlCache {
    constructor({ defaultTtlMs = 60_000, maxSize = 500 } = {}) {
        this.store = new Map();
        this.defaultTtlMs = defaultTtlMs;
        this.maxSize = maxSize;
    }

    set(key, value, ttlMs = this.defaultTtlMs) {
        if (this.store.size >= this.maxSize) {
            const firstKey = this.store.keys().next().value;
            this.store.delete(firstKey);
        }
        const expireAt = Date.now() + ttlMs;
        this.store.set(key, { value, expireAt });
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (entry.expireAt < Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }

    has(key) {
        return this.get(key) !== undefined;
    }

    delete(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}
