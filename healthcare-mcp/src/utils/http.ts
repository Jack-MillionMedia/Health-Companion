// HTTP client utilities for external API calls
// Optimized with timeouts, retries, exponential backoff, and request deduplication

import { httpLogger } from "./logger.js";

export interface HttpResponse<T> {
  data: T;
  status: number;
  ok: boolean;
  cached?: boolean;
  durationMs?: number;
}

export interface FetchOptions extends RequestInit {
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in ms (default: 200) */
  retryDelayMs?: number;
  /** Skip deduplication for this request */
  skipDedup?: boolean;
}

// Configuration
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 200;
const USER_AGENT = "Healthcare-MCP-Server/1.0.0";

// In-flight request deduplication map
// Prevents duplicate concurrent requests for the same URL
const inFlightRequests = new Map<string, Promise<HttpResponse<unknown>>>();

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 100; // Add 0-100ms jitter
  return exponentialDelay + jitter;
}

/**
 * Check if error/status is retryable
 */
function isRetryable(status: number, error?: Error): boolean {
  // Retry on network errors
  if (error?.name === "AbortError") return false; // Timeout - don't retry
  if (error) return true; // Other network errors - retry
  
  // Retry on server errors and rate limits
  return status >= 500 || status === 429 || status === 408;
}

/**
 * Enhanced fetch with timeouts, retries, and deduplication
 */
export async function fetchJson<T>(
  url: string,
  options?: FetchOptions
): Promise<HttpResponse<T>> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    skipDedup = false,
    ...fetchOptions
  } = options || {};

  // Request deduplication: return existing in-flight request for same URL
  const dedupKey = `${fetchOptions.method || "GET"}:${url}`;
  if (!skipDedup) {
    const existing = inFlightRequests.get(dedupKey);
    if (existing) {
      httpLogger.debug({ url }, "request deduplicated");
      return existing as Promise<HttpResponse<T>>;
    }
  }

  const executeRequest = async (): Promise<HttpResponse<T>> => {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let lastStatus = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "User-Agent": USER_AGENT,
              "Connection": "keep-alive",
              ...fetchOptions.headers,
            },
          });

          clearTimeout(timeoutId);
          lastStatus = response.status;

          // Parse response
          const data = await response.json() as T;
          const durationMs = Date.now() - startTime;

          // Log successful request
          if (attempt > 0) {
            httpLogger.info({ url, attempt, durationMs, status: response.status }, "request succeeded after retry");
          }

          return {
            data,
            status: response.status,
            ok: response.ok,
            durationMs,
          };
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (attempt < maxRetries && isRetryable(lastStatus, lastError)) {
          const delay = getRetryDelay(attempt, retryDelayMs);
          httpLogger.warn(
            { url, attempt: attempt + 1, maxRetries, delayMs: delay, error: lastError.message },
            "request failed, retrying"
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // No more retries
        break;
      }
    }

    // All retries exhausted
    const durationMs = Date.now() - startTime;
    httpLogger.error(
      { url, durationMs, error: lastError?.message, status: lastStatus },
      "request failed after all retries"
    );

    // Return error response instead of throwing (matches existing behavior)
    return {
      data: { error: { message: lastError?.message || "Request failed" } } as T,
      status: lastStatus || 500,
      ok: false,
      durationMs,
    };
  };

  // Execute with deduplication
  const requestPromise = executeRequest();
  
  if (!skipDedup) {
    inFlightRequests.set(dedupKey, requestPromise);
    requestPromise.finally(() => {
      inFlightRequests.delete(dedupKey);
    });
  }

  return requestPromise;
}

/**
 * Fetch multiple URLs in parallel with concurrency control
 */
export async function fetchJsonParallel<T>(
  urls: string[],
  options?: FetchOptions & { concurrency?: number }
): Promise<HttpResponse<T>[]> {
  const { concurrency = 5, ...fetchOptions } = options || {};
  const results: HttpResponse<T>[] = [];
  
  // Process in batches for concurrency control
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => fetchJson<T>(url, fetchOptions))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  
  return filtered.length > 0 ? `?${filtered.join("&")}` : "";
}

/**
 * Get current deduplication stats (for monitoring)
 */
export function getHttpStats(): { inFlightRequests: number } {
  return {
    inFlightRequests: inFlightRequests.size,
  };
}
