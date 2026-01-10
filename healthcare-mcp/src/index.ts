// Healthcare API MCP Server with AI Chat
// Provides tools for OpenFDA, clinical guidelines, and CMS pricing data
// Plus a ChatGPT-powered assistant interface

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { handleMcpRequest, handleLegacyToolsList, handleLegacyToolCall } from "./mcp/handler.js";
import { registerAllTools } from "./mcp/tools.js";
import { HealthcareChat } from "./ai/chat.js";
import { apiRateLimiter, chatRateLimiter, mcpRateLimiter } from "./middleware/rate-limit.js";

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

// Session-based chat instances
const chatSessions = new Map<string, HealthcareChat>();

function getChatSession(sessionId: string): HealthcareChat | null {
  if (!OPENAI_API_KEY) return null;
  
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, new HealthcareChat(OPENAI_API_KEY, executeToolForAI));
  }
  return chatSessions.get(sessionId)!;
}

// Middleware
app.use(express.json({ limit: "100kb" })); // Limit request body size
app.use(express.static(path.join(__dirname, "web")));

// Apply rate limiting globally first, then specific limiters per route
app.use(apiRateLimiter);

// Request logging with timing
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Log request
  console.log(JSON.stringify({
    type: "request",
    id: requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
  }));

  // Log response on finish
  res.on("finish", () => {
    console.log(JSON.stringify({
      type: "response",
      id: requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start,
    }));
  });

  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    service: "Healthcare API MCP",
    ai_enabled: !!OPENAI_API_KEY
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
      error: "AI chat not configured. Set OPENAI_API_KEY environment variable." 
    });
    return;
  }

  const { message, sessionId = "default" } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    const chat = getChatSession(sessionId);
    if (!chat) {
      res.status(503).json({ error: "Chat service unavailable" });
      return;
    }

    console.log(`💬 User: ${message.substring(0, 100)}...`);
    const response = await chat.chat(message);
    console.log(`🤖 Assistant: ${response.substring(0, 100)}...`);

    res.json({ response, sessionId });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Chat failed" 
    });
  }
});

// Clear chat history
app.post("/api/chat/clear", (req, res) => {
  const { sessionId = "default" } = req.body;
  chatSessions.delete(sessionId);
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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32603,
      message: "Internal server error",
    },
  });
});

// Initialize and start server
function main(): void {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║   🏥 Healthcare AI Assistant           ║");
  console.log("╚════════════════════════════════════════╝\n");

  // Register all tools
  registerAllTools();

  console.log("");

  // Check for OpenAI API key
  if (OPENAI_API_KEY) {
    console.log("✓ AI Chat enabled (GPT-5-nano)");
  } else {
    console.log("⚠ AI Chat disabled - set OPENAI_API_KEY to enable");
  }

  console.log("");

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("\nEndpoints:");
    if (OPENAI_API_KEY) {
      console.log(`  🌐 http://localhost:${PORT}/           - AI Chat Interface`);
      console.log(`  💬 http://localhost:${PORT}/api/chat   - Chat API`);
    }
    console.log(`  📋 http://localhost:${PORT}/mcp/tools  - List tools`);
    console.log(`  🔧 http://localhost:${PORT}/mcp/call   - Call tool`);
    console.log(`  🔌 http://localhost:${PORT}/mcp        - MCP endpoint`);
    console.log("\n");
  });
}

main();
