// Semantic Query Cache - Instant responses for similar/repeat questions
// Provides sub-100ms responses for queries we've seen before

import { cacheLogger } from "./logger.js";

interface CachedResponse {
    response: string;
    timestamp: number;
    hitCount: number;
}

// Configuration
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Semantic Query Cache
 * Stores LLM responses indexed by normalized query strings
 * Provides instant responses for repeat/similar questions
 */
export class QueryCache {
    private cache = new Map<string, CachedResponse>();
    private stats = { hits: 0, misses: 0, sets: 0 };

    /**
     * Normalize a query for cache lookup
     * - Lowercase
     * - Remove extra whitespace
     * - Remove punctuation
     * - Sort words (for fuzzy matching)
     */
    private normalize(query: string): string {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, "") // Remove punctuation
            .replace(/\s+/g, " ") // Collapse whitespace
            .trim()
            .split(" ")
            .filter(w => w.length > 2) // Remove short words
            .sort()
            .join(" ");
    }

    /**
     * Extract key medical terms for semantic matching
     */
    private extractKeyTerms(query: string): Set<string> {
        const normalized = query.toLowerCase();
        const terms = new Set<string>();

        // Common drug name patterns
        const drugPatterns = [
            /\b\w+ine\b/g,  // sertraline, fluoxetine
            /\b\w+ol\b/g,   // metoprolol, propranolol
            /\b\w+in\b/g,   // metformin, aspirin
            /\b\w+pril\b/g, // lisinopril, enalapril
            /\b\w+statin\b/g, // atorvastatin, simvastatin
        ];

        for (const pattern of drugPatterns) {
            const matches = normalized.match(pattern);
            if (matches) matches.forEach(m => terms.add(m));
        }

        // Common query intents
        const intents = ["side effects", "interactions", "dosage", "uses", "warnings", "price", "trials"];
        for (const intent of intents) {
            if (normalized.includes(intent)) terms.add(intent);
        }

        return terms;
    }

    /**
     * Calculate similarity between two queries (0-1)
     */
    private similarity(query1: string, query2: string): number {
        const terms1 = this.extractKeyTerms(query1);
        const terms2 = this.extractKeyTerms(query2);

        if (terms1.size === 0 || terms2.size === 0) {
            // Fallback to normalized string match
            return this.normalize(query1) === this.normalize(query2) ? 1.0 : 0.0;
        }

        // Jaccard similarity
        const intersection = new Set([...terms1].filter(x => terms2.has(x)));
        const union = new Set([...terms1, ...terms2]);

        return intersection.size / union.size;
    }

    /**
     * Get cached response for a query
     * Returns undefined if no match found
     */
    get(query: string): string | undefined {
        const now = Date.now();
        const queryNorm = this.normalize(query);

        // Exact match first (fastest)
        const exact = this.cache.get(queryNorm);
        if (exact && now - exact.timestamp < CACHE_TTL_MS) {
            exact.hitCount++;
            this.stats.hits++;
            cacheLogger.debug({ query: query.slice(0, 50), type: "exact" }, "query cache hit");
            return exact.response;
        }

        // Semantic match (slower, but catches variations)
        for (const [key, cached] of this.cache) {
            if (now - cached.timestamp >= CACHE_TTL_MS) continue;

            if (this.similarity(query, key) >= SIMILARITY_THRESHOLD) {
                cached.hitCount++;
                this.stats.hits++;
                cacheLogger.debug({ query: query.slice(0, 50), type: "semantic" }, "query cache hit");
                return cached.response;
            }
        }

        this.stats.misses++;
        return undefined;
    }

    /**
     * Store a response in the cache
     */
    set(query: string, response: string): void {
        // Don't cache very short or error responses
        if (response.length < 100 || response.includes("error") || response.includes("Error")) {
            return;
        }

        // Enforce max size (LRU-style eviction)
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const oldest = [...this.cache.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) this.cache.delete(oldest[0]);
        }

        const normalized = this.normalize(query);
        this.cache.set(normalized, {
            response,
            timestamp: Date.now(),
            hitCount: 0,
        });

        this.stats.sets++;
        cacheLogger.debug({ query: query.slice(0, 50), size: this.cache.size }, "query cached");
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? this.stats.hits / (this.stats.hits + this.stats.misses)
                : 0,
        };
    }

    /**
     * Clear expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, cached] of this.cache) {
            if (now - cached.timestamp >= CACHE_TTL_MS) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance
export const queryCache = new QueryCache();
