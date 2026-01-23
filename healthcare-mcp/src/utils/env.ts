// Centralized environment configuration with validation
import * as dotenv from "dotenv";
import { z } from "zod";
import { logger } from "./logger.js";

dotenv.config({ override: false });

const optionalString = (maxLen = 2048) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed.slice(0, maxLen) : undefined;
    },
    z.string().optional()
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  OPENAI_API_KEY: optionalString(200),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4o"),
  OPENAI_MAX_TOKENS: z.coerce.number().int().positive().max(16384).default(8192),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(1),
  OPENFDA_API_KEY: optionalString(200),
  NCBI_API_KEY: optionalString(200),
  SENTRY_DSN: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined),
    z.string().url().optional()
  ),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(
    {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
    "invalid environment configuration"
  );
  throw new Error("Invalid environment configuration. See logs for details.");
}

export const env = parsed.data;
