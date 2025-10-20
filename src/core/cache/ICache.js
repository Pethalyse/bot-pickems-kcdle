/**
 * @template T
 * @interface
 */
export class ICache {
    constructor(defaultTtlMs) {
        this.defaultTtlMs = defaultTtlMs;
    }
    /**
     * @param {string} key @param {T} value @param {number=} ttlMs
     * @param {any} value
     * @param {number} ttlMs
     */
    set(key, value, ttlMs = this.defaultTtlMs) { throw new Error('not impl'); }
    /** @param {string} key @returns {Promise<T|undefined>|(T|undefined)} */
    get(key) { throw new Error('not impl'); }
    /** @param {string} key @returns {Promise<boolean>|boolean} */
    has(key) { throw new Error('not impl'); }
    /** @param {string} key */
    delete(key) { throw new Error('not impl'); }
    clear() { throw new Error('not impl'); }
    connect() {}
    disconnect() {}
}
