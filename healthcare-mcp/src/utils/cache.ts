// In-memory cache with TTL for external API responses
// Reduces load on upstream APIs and improves response times

import { cacheLogger, logEvents } from "./logger.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
}

// Cache configuration
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500; // Maximum entries
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every minute

export class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    size: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get a cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logEvents.cacheMiss(key);
      return undefined;
    }

    const now = Date.now();
    if (now >= entry.expiresAt) {
      // Entry expired
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      logEvents.cacheEvict(key, "expired");
      return undefined;
    }

    this.stats.hits++;
    logEvents.cacheHit(key, entry.expiresAt - now);
    return entry.value as T;
  }

  /**
   * Set a cache entry with TTL
   */
  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    // Enforce max cache size with LRU-like eviction
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictOldest();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttlMs,
      createdAt: now,
    });

    this.stats.sets++;
    this.stats.size = this.cache.size;
    logEvents.cacheSet(key, ttlMs);
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
      logEvents.cacheEvict(key, "manual");
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    cacheLogger.info({ evicted: size }, "cache cleared");
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Generate a cache key from tool name and arguments
   */
  static generateKey(toolName: string, args: Record<string, unknown>): string {
    // Sort keys for consistent hashing
    const sortedArgs = Object.keys(args)
      .sort()
      .reduce((acc, key) => {
        acc[key] = args[key];
        return acc;
      }, {} as Record<string, unknown>);

    return `${toolName}:${JSON.stringify(sortedArgs)}`;
  }

  /**
   * Evict the oldest entry (simple LRU approximation)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
      logEvents.cacheEvict(oldestKey, "capacity");
    }
  }

  /**
   * Remove all expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      cacheLogger.debug({ cleaned, remaining: this.cache.size }, "cache cleanup");
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    // Don't prevent process exit
    this.cleanupTimer.unref();
  }

  /**
   * Stop the cleanup timer (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
export const responseCache = new ResponseCache();

// Cache TTL constants for different data types
export const CacheTTL = {
  // FDA data changes infrequently
  DRUG_LOOKUP: 5 * 60 * 1000, // 5 minutes
  DRUG_LABELS: 10 * 60 * 1000, // 10 minutes
  DRUG_RECALLS: 5 * 60 * 1000, // 5 minutes
  ADVERSE_EVENTS: 5 * 60 * 1000, // 5 minutes

  // Interactions from our static DB
  DRUG_INTERACTIONS: 60 * 60 * 1000, // 1 hour (our data is static)

  // Clinical trials data
  CLINICAL_TRIALS: 5 * 60 * 1000, // 5 minutes
  TRIAL_DETAILS: 10 * 60 * 1000, // 10 minutes

  // Guidelines change slowly
  GUIDELINES: 15 * 60 * 1000, // 15 minutes

  // Pricing data
  MEDICARE_PRICING: 30 * 60 * 1000, // 30 minutes
  PROCEDURE_PRICING: 60 * 60 * 1000, // 1 hour (reference data)
} as const;

// Helper to create a cached version of any async function
export function withCache<T, Args extends Record<string, unknown>>(
  toolName: string,
  fn: (args: Args) => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): (args: Args) => Promise<T> {
  return async (args: Args): Promise<T> => {
    const key = ResponseCache.generateKey(toolName, args);

    // Check cache first
    const cached = responseCache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(args);
    responseCache.set(key, result, ttlMs);
    return result;
  };
}

export default responseCache;
