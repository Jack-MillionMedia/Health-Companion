// Rate limiting middleware for API protection
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// Configuration constants
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
const MAX_CHAT_REQUESTS_PER_WINDOW = 30; // More restrictive for AI endpoints

// Standard rate limiter for general API endpoints
// Using default keyGenerator (handles IPv6 correctly)
export const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute.`,
    retryAfter: Math.ceil(WINDOW_MS / 1000),
  },
  skip: (req: Request): boolean => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
  handler: (req: Request, res: Response): void => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute.`,
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
  },
});

// Stricter rate limiter for AI chat endpoints (more expensive operations)
export const chatRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_CHAT_REQUESTS_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many chat requests",
    message: `Chat rate limit exceeded. Maximum ${MAX_CHAT_REQUESTS_PER_WINDOW} requests per minute.`,
    retryAfter: Math.ceil(WINDOW_MS / 1000),
  },
  handler: (req: Request, res: Response): void => {
    console.warn(`Chat rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Too many chat requests",
      message: `Chat rate limit exceeded. Maximum ${MAX_CHAT_REQUESTS_PER_WINDOW} requests per minute.`,
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
  },
});

// MCP endpoint rate limiter
export const mcpRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    console.warn(`MCP rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32000,
        message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute.`,
      },
    });
  },
});
