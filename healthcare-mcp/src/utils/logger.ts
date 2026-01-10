// Structured logging with pino
// Provides consistent, JSON-formatted logs for observability

import pino from "pino";

// Determine if we're in development (pretty print) or production (JSON)
const isDev = process.env.NODE_ENV !== "production";

// Create the base logger
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // In dev, use pino-pretty for readable output; in prod, use JSON
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  // Base fields included in every log
  base: {
    service: "healthcare-mcp",
    version: "1.0.0",
  },
  // Custom serializers for consistent field formatting
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Child loggers for specific components
export const httpLogger = logger.child({ component: "http" });
export const toolLogger = logger.child({ component: "tool" });
export const cacheLogger = logger.child({ component: "cache" });
export const sessionLogger = logger.child({ component: "session" });
export const aiLogger = logger.child({ component: "ai" });

// Request context logger factory
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

// Structured log helpers for common events
export const logEvents = {
  // HTTP request/response
  httpRequest: (requestId: string, method: string, path: string, ip: string) => {
    httpLogger.info({ requestId, method, path, ip }, "incoming request");
  },

  httpResponse: (
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ) => {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    httpLogger[level](
      { requestId, method, path, statusCode, durationMs },
      "request completed"
    );
  },

  // Tool execution
  toolCall: (requestId: string, toolName: string, args: Record<string, unknown>) => {
    // Sanitize args to avoid logging sensitive data
    const sanitizedArgs = Object.fromEntries(
      Object.entries(args).map(([k, v]) => [
        k,
        typeof v === "string" && v.length > 100 ? `${v.slice(0, 100)}...` : v,
      ])
    );
    toolLogger.info({ requestId, toolName, args: sanitizedArgs }, "tool called");
  },

  toolSuccess: (requestId: string, toolName: string, durationMs: number) => {
    toolLogger.info({ requestId, toolName, durationMs }, "tool completed");
  },

  toolError: (requestId: string, toolName: string, error: string, durationMs: number) => {
    toolLogger.error({ requestId, toolName, error, durationMs }, "tool failed");
  },

  // Validation
  validationError: (requestId: string, toolName: string, error: string) => {
    toolLogger.warn({ requestId, toolName, error }, "validation failed");
  },

  // Cache events
  cacheHit: (key: string, ttlRemaining: number) => {
    cacheLogger.debug({ key, ttlRemaining }, "cache hit");
  },

  cacheMiss: (key: string) => {
    cacheLogger.debug({ key }, "cache miss");
  },

  cacheSet: (key: string, ttl: number) => {
    cacheLogger.debug({ key, ttl }, "cache set");
  },

  cacheEvict: (key: string, reason: string) => {
    cacheLogger.debug({ key, reason }, "cache evict");
  },

  // Session events
  sessionCreated: (sessionId: string, totalSessions: number) => {
    sessionLogger.info({ sessionId, totalSessions }, "session created");
  },

  sessionExpired: (sessionId: string, reason: string) => {
    sessionLogger.info({ sessionId, reason }, "session expired");
  },

  sessionEvicted: (sessionId: string, totalSessions: number) => {
    sessionLogger.warn({ sessionId, totalSessions }, "session evicted (capacity)");
  },

  // AI events
  aiRequest: (sessionId: string, messageLength: number) => {
    aiLogger.info({ sessionId, messageLength }, "AI request");
  },

  aiToolUse: (sessionId: string, toolName: string) => {
    aiLogger.info({ sessionId, toolName }, "AI using tool");
  },

  aiResponse: (sessionId: string, responseLength: number, durationMs: number) => {
    aiLogger.info({ sessionId, responseLength, durationMs }, "AI response");
  },

  aiError: (sessionId: string, error: string) => {
    aiLogger.error({ sessionId, error }, "AI error");
  },

  // Rate limiting
  rateLimitHit: (ip: string, path: string) => {
    httpLogger.warn({ ip, path }, "rate limit exceeded");
  },

  // Startup events
  serverStart: (port: number, aiEnabled: boolean, toolCount: number) => {
    logger.info({ port, aiEnabled, toolCount }, "server started");
  },
};

export default logger;
