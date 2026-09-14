import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  interval: number;
  maxRequests: number;
};

const caches = new Map<string, LRUCache<string, number[]>>();

const getCache = (key: string) => {
  if (!caches.has(key)) {
    caches.set(
      key,
      new LRUCache<string, number[]>({
        max: 500,
        ttl: 60 * 1000,
      }),
    );
  }
  return caches.get(key)!;
};

export const rateLimit = (key: string, options: RateLimitOptions) => {
  const cache = getCache(key);

  return {
    check: (identifier: string) => {
      const now = Date.now();
      const timestamps = cache.get(identifier) || [];
      const recent = timestamps.filter((ts) => now - ts < options.interval);

      if (recent.length >= options.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: recent[0] + options.interval,
        };
      }

      recent.push(now);
      cache.set(identifier, recent);

      return {
        allowed: true,
        remaining: options.maxRequests - recent.length,
        resetAt: now + options.interval,
      };
    },
  };
};

export const loginLimiter = rateLimit("login", {
  interval: 60_000,
  maxRequests: 5,
});

export const apiLimiter = rateLimit("api", {
  interval: 60_000,
  maxRequests: 60,
});
