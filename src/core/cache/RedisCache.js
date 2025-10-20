import IORedis from 'ioredis';
import {ICache} from "./ICache.js";

export class RedisCache extends ICache {
    /**
     * @param {object} opts
     * @param {string} opts.url - ex: redis://redis:6379/0
     * @param {number} [opts.defaultTtlMs=60000]
     * @param {string} [opts.namespace='pickems'] - préfixe des clés
     */
    constructor({ url, defaultTtlMs = 60_000, namespace = 'pickems' }) {
        super(defaultTtlMs);
        this.ns = namespace;
        this.redis = new IORedis(url, {
            lazyConnect: true,
            maxRetriesPerRequest: 2,
            enableAutoPipelining: true,
        });
    }

    async connect() {
        if (this.redis.status !== 'ready') {
            await this.redis.connect();
        }
    }

    #k(key) { return `${this.ns}:${key}`; }

    /**
     * @param {string} key
     * @param {any} value (sera JSON.stringify)
     * @param {number} [ttlMs] (millisecondes)
     */
    async set(key, value, ttlMs = this.defaultTtlMs) {
        const payload = JSON.stringify(value);
        const sec = Math.max(1, Math.floor(ttlMs / 1000));
        await this.redis.set(this.#k(key), payload, 'EX', sec);
    }

    /** @returns {any|undefined} */
    async get(key) {
        const raw = await this.redis.get(this.#k(key));
        if (raw == null) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
    }

    async has(key) {
        const n = await this.redis.exists(this.#k(key));
        return n === 1;
    }

    async delete(key) {
        await this.redis.del(this.#k(key));
    }

    async clear() {
        const pattern = `${this.ns}:*`;
        let cursor = '0';
        do {
            const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
            cursor = next;
            if (keys.length) await this.redis.del(keys);
        } while (cursor !== '0');
    }

    async disconnect() {
        await this.redis.quit();
    }
}
