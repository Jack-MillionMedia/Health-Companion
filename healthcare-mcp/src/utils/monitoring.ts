// Optional error monitoring integration (Sentry)
import type { Express } from "express";
import * as Sentry from "@sentry/node";
import { env } from "./env.js";
import { logger } from "./logger.js";

export function initMonitoring(app: Express) {
  if (!env.SENTRY_DSN) {
    logger.info("Sentry disabled (no SENTRY_DSN)");
    return { enabled: false, errorHandler: null as null | ReturnType<typeof Sentry.Handlers.errorHandler> };
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  app.use(Sentry.Handlers.requestHandler());

  logger.info("Sentry enabled");

  return {
    enabled: true,
    errorHandler: Sentry.Handlers.errorHandler(),
  };
}
