// Healthcare API MCP Server with AI Chat
// Provides tools for OpenFDA, clinical guidelines, and CMS pricing data
// Plus a ChatGPT-powered assistant interface

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { handleMcpRequest, handleLegacyToolsList, handleLegacyToolCall, getCacheStats } from "./mcp/handler.js";
import { registerAllTools } from "./mcp/tools.js";
import { HealthcareChat } from "./ai/chat.js";
import { apiRateLimiter, chatRateLimiter, mcpRateLimiter } from "./middleware/rate-limit.js";
import { disclaimerEnforcer, ensureDisclaimer } from "./middleware/disclaimer.js";
import { logger, logEvents, httpLogger } from "./utils/logger.js";
import { sessionManager, SessionConfig } from "./utils/session-manager.js";
import { responseCache } from "./utils/cache.js";

// Import tool handlers directly for AI integration
import {
  drugLookupHandler,
  adverseEventsHandler,
  drugRecallsHandler,
  drugLabelsHandler,
} from "./providers/openfda.js";
import {
  searchGuidelinesHandler,
  guidelineSummaryHandler,
} from "./providers/guidelines.js";
import {
  medicareDrugPricingHandler,
  procedurePricingHandler,
} from "./providers/cms-pricing.js";
import {
  checkDrugInteractionsHandler,
  getDrugInteractionDetailsHandler,
} from "./providers/drug-interactions.js";
import {
  searchClinicalTrialsHandler,
  getClinicalTrialDetailsHandler,
  getTrialResultsSummaryHandler,
} from "./providers/clinical-trials.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Tool executor for AI chat
async function executeToolForAI(name: string, args: Record<string, unknown>): Promise<string> {
  const handlers: Record<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>> = {
    // OpenFDA
    drug_lookup: drugLookupHandler,
    adverse_events: adverseEventsHandler,
    drug_recalls: drugRecallsHandler,
    drug_labels: drugLabelsHandler,
    // Drug Interactions
    check_drug_interactions: checkDrugInteractionsHandler,
    get_drug_interaction_details: getDrugInteractionDetailsHandler,
    // Clinical Trials
    search_clinical_trials: searchClinicalTrialsHandler,
    get_clinical_trial_details: getClinicalTrialDetailsHandler,
    get_trial_results_summary: getTrialResultsSummaryHandler,
    // Guidelines & Pricing
    search_guidelines: searchGuidelinesHandler,
    guideline_summary: guidelineSummaryHandler,
    medicare_drug_pricing: medicareDrugPricingHandler,
    procedure_pricing: procedurePricingHandler,
  };

  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const result = await handler(args);
  return result.content[0]?.text || "No data returned";
}

// Initialize session manager with chat factory
sessionManager.setChatFactory((sessionId: string) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  return new HealthcareChat(OPENAI_API_KEY, executeToolForAI);
});

// Middleware
app.use(express.json({ limit: "100kb" })); // Limit request body size
app.use(express.static(path.join(__dirname, "web")));

// Apply rate limiting globally first, then specific limiters per route
app.use(apiRateLimiter);

// Request ID and structured logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  req.requestId = requestId;

  // Log incoming request
  logEvents.httpRequest(requestId, req.method, req.path, req.ip || "unknown");

  // Log response on finish
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logEvents.httpResponse(requestId, req.method, req.path, res.statusCode, durationMs);
  });

  next();
});

// Health check (with detailed stats)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Healthcare API MCP",
    ai_enabled: !!OPENAI_API_KEY,
  });
});

// Detailed stats endpoint for monitoring
app.get("/stats", (_req, res) => {
  const cacheStats = getCacheStats();
  const sessionStats = sessionManager.getStats();
  const disclaimerStats = disclaimerEnforcer.getStats();

  res.json({
    cache: cacheStats,
    sessions: sessionStats,
    disclaimer: disclaimerStats,
    config: {
      sessionTtlMs: SessionConfig.TTL_MS,
      maxSessions: SessionConfig.MAX_SESSIONS,
    },
  });
});

// Server info
app.get("/api/info", (_req, res) => {
  res.json({
    name: "Healthcare API MCP",
    version: "1.0.0",
    protocol: "MCP Streamable HTTP (JSON-RPC 2.0)",
    protocolVersion: "2024-11-05",
    providers: ["openfda", "clinical_guidelines", "cms_pricing"],
    ai_enabled: !!OPENAI_API_KEY,
    endpoints: {
      chat: "/api/chat (POST) - AI chat interface",
      mcp: "/ or /mcp (POST) - MCP Streamable HTTP endpoint",
      legacy: {
        tools: "/mcp/tools (GET) - List tools (legacy)",
        call: "/mcp/call (POST) - Execute tool (legacy)",
      },
    },
  });
});

// AI Chat endpoint (with stricter rate limiting)
app.post("/api/chat", chatRateLimiter, async (req, res) => {
  if (!OPENAI_API_KEY) {
    res.status(503).json({
      error: "AI chat not configured. Set OPENAI_API_KEY environment variable.",
    });
    return;
  }

  const { message, sessionId = "default" } = req.body;
  const requestId = req.requestId || "unknown";

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (message.length > 10000) {
    res.status(400).json({ error: "Message too long (max 10000 characters)" });
    return;
  }

  try {
    const chat = sessionManager.getSession(sessionId);
    if (!chat) {
      res.status(503).json({ error: "Chat service unavailable" });
      return;
    }

    logEvents.aiRequest(sessionId, message.length);
    const startTime = Date.now();

    let response = await chat.chat(message);
    sessionManager.recordMessage(sessionId);

    // ENFORCE DISCLAIMER - this is critical for medical safety
    response = ensureDisclaimer(response);
    disclaimerEnforcer.enforce(response); // Track stats

    const durationMs = Date.now() - startTime;
    logEvents.aiResponse(sessionId, response.length, durationMs);

    res.json({ response, sessionId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Chat failed";
    logEvents.aiError(sessionId, errorMessage);
    res.status(500).json({ error: errorMessage });
  }
});

// Clear chat history
app.post("/api/chat/clear", (req, res) => {
  const { sessionId = "default" } = req.body;
  sessionManager.deleteSession(sessionId);
  res.json({ success: true });
});

// Serve web UI
app.get("/", (_req, res) => {
  if (OPENAI_API_KEY) {
    res.sendFile(path.join(__dirname, "web", "index.html"));
  } else {
    // Return API info if no OpenAI key
    res.json({
      name: "Healthcare API MCP",
      version: "1.0.0",
      protocol: "MCP Streamable HTTP (JSON-RPC 2.0)",
      protocolVersion: "2024-11-05",
      providers: ["openfda", "clinical_guidelines", "cms_pricing"],
      ai_enabled: false,
      message: "Set OPENAI_API_KEY to enable the AI chat interface",
      endpoints: {
        mcp: "/mcp (POST) - MCP endpoint",
        tools: "/mcp/tools (GET) - List tools",
        call: "/mcp/call (POST) - Execute tool",
      },
    });
  }
});

// MCP Streamable HTTP endpoint (JSON-RPC 2.0)
app.post("/mcp", mcpRateLimiter, handleMcpRequest);

// Legacy REST endpoints (for easier testing)
app.get("/mcp/tools", handleLegacyToolsList);
app.post("/mcp/call", mcpRateLimiter, handleLegacyToolCall);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  httpLogger.error(
    { requestId: req.requestId, error: err.message, stack: err.stack },
    "unhandled error"
  );
  res.status(500).json({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32603,
      message: "Internal server error",
    },
  });
});

// Graceful shutdown
function shutdown() {
  logger.info("shutting down gracefully...");
  sessionManager.stop();
  responseCache.stop();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Initialize and start server
function main(): void {
  // ASCII banner (compact)
  logger.info("═══════════════════════════════════════");
  logger.info("   🏥 Healthcare AI Assistant v1.0.0   ");
  logger.info("═══════════════════════════════════════");

  // Register all tools
  registerAllTools();

  const toolCount = 13;

  // Log startup info
  logEvents.serverStart(Number(PORT), !!OPENAI_API_KEY, toolCount);

  if (!OPENAI_API_KEY) {
    logger.warn("AI Chat disabled - set OPENAI_API_KEY to enable");
  }

  // Start server
  app.listen(PORT, () => {
    logger.info({ port: PORT }, "server listening");
    logger.info("endpoints available:");
    if (OPENAI_API_KEY) {
      logger.info(`  🌐 http://localhost:${PORT}/           - AI Chat Interface`);
      logger.info(`  💬 http://localhost:${PORT}/api/chat   - Chat API`);
    }
    logger.info(`  📋 http://localhost:${PORT}/mcp/tools  - List tools`);
    logger.info(`  🔧 http://localhost:${PORT}/mcp/call   - Call tool`);
    logger.info(`  📊 http://localhost:${PORT}/stats      - Server stats`);
    logger.info(`  🔌 http://localhost:${PORT}/mcp        - MCP endpoint`);
  });
}

main();
