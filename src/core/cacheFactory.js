import { TtlLruCache } from './TtlLruCache.js';
import { RedisCache } from './RedisCache.js';

export async function createCacheFromEnv() {
    const useRedis = process.env.USE_REDIS_CACHE === '1';
    if (useRedis) {
        const cache = new RedisCache({
            url: process.env.REDIS_URL || 'redis://redis:6379/0',
            defaultTtlMs: Number(process.env.CACHE_TTL_MS || 60_000),
            namespace: process.env.CACHE_NAMESPACE || 'pickems'
        });
        await cache.connect();
        return cache;
    }
    return new TtlLruCache({
        defaultTtlMs: Number(process.env.CACHE_TTL_MS || 60_000),
        maxSize: Number(process.env.CACHE_MAX_SIZE || 500)
    });
}
