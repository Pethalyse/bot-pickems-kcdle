// LRU + TTL — O(1) get/set, purge auto par TTL + taille max
export class TtlLruCache {
    constructor({ defaultTtlMs = 60_000, maxSize = 500 } = {}) {
        this.defaultTtlMs = defaultTtlMs;
        this.maxSize = maxSize;
        this.map = new Map(); // key -> { value, expireAt }
    }
    #now() { return Date.now(); }
    #expired(entry) { return entry.expireAt < this.#now(); }

    set(key, value, ttlMs = this.defaultTtlMs) {
        const expireAt = this.#now() + ttlMs;
        if (this.map.has(key)) this.map.delete(key); // réinsère en fin (LRU)
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
        // move to recent (LRU)
        this.map.delete(key);
        this.map.set(key, entry);
        return entry.value;
    }

    has(key) { return this.get(key) !== undefined; }

    delete(key) { this.map.delete(key); }

    clear() { this.map.clear(); }

    // Évite l’explosion mémoire
    #evictIfNeeded() {
        while (this.map.size > this.maxSize) {
            // supprime l’élément le plus ancien (LRU)
            const oldestKey = this.map.keys().next().value;
            this.map.delete(oldestKey);
        }
    }
}
